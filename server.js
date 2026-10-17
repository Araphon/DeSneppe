// Productieserver voor Plesk/Passenger
const { createServer } = require('http')
const next = require('next')

const port = process.env.PORT || 3100
const app = next({ dev: false, hostname: 'localhost', port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> De Sneppe klaar op poort ${port}`)
    // Planner: geplande campagnes en automatisaties (verjaardag, reviewverzoek, ...) elke 5 minuten
    const planner = () => {
      if (!process.env.CRON_SECRET) return
      fetch(`http://localhost:${port}/api/cron/marketing`, { method: 'POST', headers: { 'x-cron-secret': process.env.CRON_SECRET, 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.json()).then(r => { if (r.log && r.log.length) console.log('[planner]', r.log.join(' | ')) })
        .catch(e => console.error('[planner]', e.message))
    }
    setTimeout(planner, 60 * 1000)
    setInterval(planner, 5 * 60 * 1000)
  })
})
