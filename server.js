//corer server:    npx nodemon --watch src/db.json server.js

import jsonServer from 'json-server'

const server = jsonServer.create()
const router = jsonServer.router('src/db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(router)

server.listen(3000, () => {
    console.log('JSON Server corriendo en el puerto 3000')
})

