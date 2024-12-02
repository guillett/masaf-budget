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
	console.log(JSON.stringify(result, null, 2))
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
