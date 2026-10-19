import UIKit
import Capacitor
import Network

// Bridge met onze eigen plugin (in de app-target, zodat er geen extra Swift-pakket nodig is)
class KassaViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SneppePrinterPlugin())
    }
}

/// Stuurt ruwe printerdata (ESC/POS of ZPL) via TCP naar een printer in het winkelnetwerk (standaard poort 9100)
/// en houdt het scherm wakker. JavaScript-naam: "SneppePrinter".
@objc(SneppePrinterPlugin)
public class SneppePrinterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SneppePrinterPlugin"
    public let jsName = "SneppePrinter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise)
    ]

    @objc func send(_ call: CAPPluginCall) {
        guard let host = call.getString("host"), !host.isEmpty,
              let b64 = call.getString("data"), let data = Data(base64Encoded: b64) else {
            call.reject("Ongeldige printopdracht"); return
        }
        let poort = call.getInt("port") ?? 9100
        let timeout = Double(call.getInt("timeoutMs") ?? 8000) / 1000.0
        guard let nwPoort = NWEndpoint.Port(rawValue: UInt16(poort)) else { call.reject("Ongeldige poort"); return }
        let wachtrij = DispatchQueue(label: "be.desneppe.kassa.printer")
        let verbinding = NWConnection(host: NWEndpoint.Host(host), port: nwPoort, using: .tcp)
        var klaar = false
        func einde(_ fout: String?) {
            if klaar { return }
            klaar = true
            verbinding.cancel()
            if let fout = fout { call.reject(fout) } else { call.resolve() }
        }
        verbinding.stateUpdateHandler = { state in
            switch state {
            case .ready:
                verbinding.send(content: data, completion: .contentProcessed { fout in
                    if let fout = fout { einde("Versturen mislukt: \(fout.localizedDescription)") }
                    else { wachtrij.asyncAfter(deadline: .now() + 0.3) { einde(nil) } }
                })
            case .failed(let fout): einde("Printer \(host) niet bereikbaar: \(fout.localizedDescription)")
            case .waiting(let fout): einde("Printer \(host) niet bereikbaar: \(fout.localizedDescription)")
            default: break
            }
        }
        verbinding.start(queue: wachtrij)
        wachtrij.asyncAfter(deadline: .now() + timeout) { einde("Printer \(host) reageert niet (time-out)") }
    }

    @objc func keepAwake(_ call: CAPPluginCall) {
        let aan = call.getBool("aan") ?? true
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = aan
            call.resolve()
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = KassaViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
