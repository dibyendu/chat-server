const http = require('http'),
fs = require('fs'),
args = process.argv.slice(2, process.argv.length),
content = args[0],
index = args[1],
port = parseInt(args[2], 10)

const requestHandler = (request, response) => {
	let file = request.url
	if (file === '/') {
		let contents = fs.existsSync(`./${content}/${index}`) ?
		fs.readFileSync(`./${content}/${index}`, 'utf8') :
		fs.readFileSync(`./${content}/index.html`, 'utf8')
		response.end(contents)
	}
	else if (fs.existsSync('.' + file)) {
		let contents = fs.readFileSync('.' + file)
		response.end(contents)
	}
	else
	response.end('')
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
	if (err) {
		return console.log('something bad happened', err)
	}
	console.log(`server is listening on ${port}`)
})