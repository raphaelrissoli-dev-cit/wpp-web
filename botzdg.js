const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

function delay(t, v) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ]
  }
});

client.initialize();

io.on('connection', function (socket) {
  socket.emit('message', '© BOT-ZDG - Iniciado');
  socket.emit('qr', './icon.svg');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
    });
  });

  client.on('ready', (item) => {

    socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('qr', './check.svg')
    console.log('© BOT-ZDG Dispositivo pronto');
  });

  client.on('authenticated', (item) => {
   
    socket.emit('authenticated', '© BOT-ZDG Autenticado!');
    socket.emit('message', '© BOT-ZDG Autenticado!');
    console.log('© BOT-ZDG Autenticado');
  });

  client.on('auth_failure', function () {
    socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
    console.error('© BOT-ZDG Falha na autenticação');
  });

  client.on('change_state', state => {
    console.log('© BOT-ZDG Status de conexão: ', state);
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', '© BOT-ZDG Cliente desconectado!');
    console.log('© BOT-ZDG Cliente desconectado', reason);
    client.initialize();
  });
});

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
});


app.get('/numbers', async(req,res) => {
  
  res.json({"wid":client.info.wid, "platform": client.info.platform })
})

// Send media
app.post('/send-media', [
  body('number').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
});

client.on('message', async msg => {

  const nomeContato = msg._data.notifyName;
  let groupChat = await msg.getChat();

  // if (groupChat.isGroup) return null;

  if (msg.type.toLowerCase() == "e2e_notification") return null;

  if (msg.body == "") return null;

  if (msg.from.includes("@g.us")) return null;
  if (msg.body == "!ping") {
    msg.reply("pong")
  }
});

console.log("\nA Comunidade ZDG é a oportunidade perfeita para você aprender a criar soluções incríveis usando as APIs, sem precisar de experiência prévia com programação. Com conteúdo exclusivo e atualizado, você terá tudo o que precisa para criar robôs, sistemas de atendimento e automações do zero. O curso é projetado para iniciantes e avançados, e oferece um aprendizado prático e passo a passo para que você possa criar soluções incríveis.")
console.log("\nIncreva-se agora acessando link: comunidadezdg.com.br\n")

server.listen(port, function () {
  console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});
