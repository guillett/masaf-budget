require("dotenv").config()
const bluebird = require("bluebird")
const fs = require('fs')

const instance = process.env.GRIST_INSTANCE
const docId = process.env.GRIST_DOC_ID
const tableId = process.env.GRIST_TABLE_ID
const apiKey = process.env.GRIST_API_KEY

function grist(url) {
	return fetch(url,
		{ headers: {
			"Authorization": `Bearer ${apiKey}`,
			"content-Type": "application/json"
		}
	})
}

function gristC(method, url, body, headers) {
	return fetch(url,
		{
			method,
			body,
			headers: {
			...headers,
			"Authorization": `Bearer ${apiKey}`,
		}
	})
}

async function checkAccess() {
	const accesses = await fetchAccess()
	const peopleData = await getRecords()
	const people = peopleData.records
	const emailMap = {}
	people.forEach(p => {
		p.accesses = []
		emailMap[p.fields.Email] = p
	})

	const toRemove = []
	const toAddOrUpdate = []
	accesses.users.forEach(a => {
		const r = emailMap[a.email]
		if (a.parentAccess !== null) {
			if (r) {
				r.accesses.push(a)
			}
			return
		}
		if (!r) {
			toRemove.push(a)
		} else {
			r.accesses.push(a)
			if (r.accesses.length > 1) {
				console.error("Bogus user")
				console.error(JSON.stringify(r))
				process.exit(1)
			}
			if (a.access !== "editors") {
				toAddOrUpdate.push(r)
			}
		}
	})

	people.forEach(p => {
		if (p.accesses.length == 0) {
			if (p.fields.Email) {
				toAddOrUpdate.push(p)
			}
		}
	})

	const accessChanges = {}
	toRemove.forEach(a => {
		accessChanges[a.email] = null
	})

	toAddOrUpdate.forEach(v => {
		accessChanges[v.fields.Email] = "editors"
	})

	if (Object.keys(accessChanges).length == 0) {
		console.log('No changes to access rules required.')
		return
	}
	if (process.argv[process.argv.length-1] !== "--real") {
		console.log(accessChanges)
		console.log('Add --real to apply these changes.')
		return
	}

	const data = {
		delta: {
			maxInheritedRole: "owners",
			users: accessChanges
		}
	}
	const payload = JSON.stringify(data, null, 2)
	await gristC("PATCH", `${instance}/api/docs/${docId}/access`, payload, {
		"content-Type": "application/json"
	})
}
checkAccess()

async function updateFreelanceAccess() {
	const betaData = require("../../Téléchargements/authors.json")
	betaData.forEach(p => {
		const ends = p.missions.filter(m => m.end).map(m => new Date(m.end))
		const sortedEnds = ends.toSorted((a, b) => a - b)
		p.end = sortedEnds[sortedEnds.length-1]
	})

	const peopleMap = betaData.reduce((a, v) => {
		a[v.id] = v
		return a
	}, {})

	const peopleData = await getRecords()
	const people = peopleData.records

	const now = new Date()

	const updates = []
	people.forEach(p => {
		if (!p.fields.Email.endsWith('@beta.gouv.fr')) {
			return
		}
		const id = p.fields.Email.split('@')[0]
		const match = peopleMap[id]
		if (!match) {
			console.error(`${id} missing...`)
			return
		}

		if (p.fields.Acces_freelance_autorise) {
			if (match.end < now) {
				updates.push({
					id: p.id,
					fields: {
						Acces_freelance_autorise: false
					}
				})
			}
		} else {
			if (match.end > now) {
				updates.push({
					id: p.id,
					fields: {
						Acces_freelance_autorise: true
					}
				})
			}
		}
	})
	if (updates.length == 0) {
		console.log('No changes to Acces_freelance_autorise required.')
		return
	}
	if (process.argv[process.argv.length-1] !== "--real") {
		console.log(updates)
		console.log('Add --real to apply these changes.')
		return
	}

	const data = {
		records: updates
	}
	const payload = JSON.stringify(data, null, 2)
	await gristC("PATCH", `${instance}/api/docs/${docId}/tables/${tableId}/records`, payload, {
		"content-Type": "application/json"
	})
}
updateFreelanceAccess()

async function fetchAccess() {
	const response = await grist(`${instance}/api/docs/${docId}/access`)
	const result = await response.json()
	return result
}

async function fetchTableMeta() {
	const response = await grist(`${instance}/api/docs/${docId}/tables`)
	const result = await response.json()

	fs.writeFileSync("data/tables.json", JSON.stringify(result))

	bluebird.map(result.tables, async function (table) {
		const tableId = table.id
		const r = await grist(`${instance}/api/docs/${docId}/tables/${tableId}/columns`)
		const d = await r.json()
		return fs.writeFileSync(`data/table.${tableId}.json`, JSON.stringify(d))
	}, { concurrency: 3})
}
//fetchTableMeta()

function group() {
	const m = fs.readdirSync('data').filter(n => n.startsWith("table.")).map(n => {
		const data = require('./data/' + n)
		data.name = n
		return data
	})
	return fs.writeFileSync(`data/tabledata.json`, JSON.stringify(m))
}
//group()


function extract() {
	const d = require('./data/tabledata.json')
	console.log(d.filter(n => n.name.startsWith('table.Bon'))[0].columns.filter(c => c.id.match(/devis/)))
}
//extract()

async function getAttachments() {
	const response = await grist(`${instance}/api/docs/${docId}/attachments`)
	const result = await response.json()
	console.log(JSON.stringify(result, null, 2))
}
//getAttachments()

const buffer = require('buffer')
async function postAttachment() {
	const fileToSend = new buffer.File([fs.readFileSync("./index.js")], "index.js")
	let formData = new FormData()
	formData.append("upload", fileToSend)

	const re = await gristC("POST", `${instance}/api/docs/${docId}/attachments`, formData)
	const res = await re.json()
	console.log(res)
}
/*postAttachment().then(() => {
	getAttachments()
})/*/

async function getRecords() {
	const response = await grist(`${instance}/api/docs/${docId}/tables/${tableId}/records`)
	const result = await response.json()
	return result
}
//getRecords()

async function updateAttachment() {
	const response = await gristC("PATCH", `${instance}/api/docs/${docId}/tables/${tableId}/records`, JSON.stringify({
		records: [{
		id: 4,
		fields: {
			Attachments: [
	          "L",
	          9,
	        ],
		}
	}]}), {"content-Type": "application/json"})
	const result = await response.json()
	console.log(JSON.stringify(result, null, 2))
}
//updateAttachment()
