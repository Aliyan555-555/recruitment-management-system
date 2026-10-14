// Local mail catcher: accepts every email the app sends and records it to mails.json (nothing leaves this machine).
import { SMTPServer } from "smtp-server"
import { simpleParser } from "mailparser"
import fs from "node:fs"
const FILE = new URL("./mails.json", import.meta.url)
fs.writeFileSync(FILE, "[]")
const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onAuth: (a, s, cb) => cb(null, { user: 1 }),
  onData(stream, session, cb) {
    simpleParser(stream).then((m) => {
      const html = m.html || m.textAsHtml || ""
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1])
      const list = JSON.parse(fs.readFileSync(FILE, "utf8"))
      list.push({ at: new Date().toISOString(), to: m.to?.text, subject: m.subject, links })
      fs.writeFileSync(FILE, JSON.stringify(list, null, 1))
      cb()
    }).catch(cb)
  },
})
server.listen(2525, "127.0.0.1", () => console.log("mail sink on 2525"))
