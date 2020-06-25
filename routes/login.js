var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();
var Usuario = require('../models/usuario');

// //Google

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);



// // ===========================================
// // Autenticación Google
// // ===========================================


var CLIENT_ID = require('../config/config').CLIENT_ID;

var GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;

app.post('/google', (req, res, next) => {
    var token = req.body.token;
    const oAuth2Client = new OAuth2Client(
        CLIENT_ID,
        GOOGLE_SECRET
    );
    const tiket = oAuth2Client.verifyIdToken({
        idToken: token
            //audience: GOOGLE_CLIENT_ID
    });

    tiket.then(data => {

        var payload = data.getPayload();
        var userid = payload['sub'];

        Usuario.findOne({ email: payload.email }, (err, usuario) => {

            if (err) {
                return res.status(500).json({
                    ok: true,
                    mensaje: 'Error al buscar usuario - login',
                    errors: err
                });
            }

            if (usuario) {

                if (usuario.google === false) {
                    return res.status(400).json({
                        ok: true,
                        mensaje: 'Debe de usar su autenticación normal'
                    });
                } else {

                    usuario.password = ':)';

                    var token = jwt.sign({ usuario: usuario }, SEED, { expiresIn: 14400 }); // 4 horas

                    res.status(200).json({
                        ok: true,
                        usuario: usuario,
                        token: token,
                        id: usuario._id,
                        menu: obtenerMenu(usuario.role)
                    });

                }

                // Si el usuario no existe por correo
            } else {

                var usuario = new Usuario();


                usuario.nombre = payload.name;
                usuario.email = payload.email;
                usuario.password = ':)';
                usuario.img = payload.picture;
                usuario.google = true;

                usuario.save((err, usuarioDB) => {

                    if (err) {
                        return res.status(500).json({
                            ok: true,
                            mensaje: 'Error al crear usuario - google',
                            errors: err
                        });
                    }


                    var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4 horas

                    res.status(200).json({
                        ok: true,
                        usuario: usuarioDB,
                        token: token,
                        id: usuarioDB._id,
                        menu: obtenerMenu(usuarioDB.role)
                    });

                });

            }


        });
    });
});


// ===========================================
// Autenticación normal
// ===========================================

app.post('/', (req, res) => {

    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (!usuarioDB) {

            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });

        }

        if (!bcrypt.compareSync(body.password, usuarioDB.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - password',
                errors: err
            });
        }

        //CREAR UN TOKEN
        usuarioDB.password = ':-)';
        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4horas

        res.status(200).json({
            ok: true,
            usuario: usuarioDB,
            token: token,
            id: usuarioDB._id,
            menu: obtenerMenu(usuarioDB.role)
        });
    });



});

function obtenerMenu(ROLE) {

    var menu = [{
            titulo: 'Principal',
            icono: 'mdi mdi-gauge',
            submenu: [
                { titulo: 'Dashboard', url: '/dashboard' },
                { titulo: 'ProgressBar', url: '/progress' },
                { titulo: 'Gráficas', url: '/graficas1' },
                { titulo: 'Promesas', url: '/promesas' },
                { titulo: 'Rxjs', url: '/rxjs' }
            ]
        },
        {
            titulo: 'Mantenimientos',
            icono: 'mdi mdi-folder-lock-open',
            submenu: [
                // { titulo: 'Usuarios', url: '/usuarios'},
                { titulo: 'Hospitales', url: '/hospitales' },
                { titulo: 'Médicos', url: '/medicos' },
            ]
        }

    ];

    if (ROLE === 'ADMIN_ROLE') {

        menu[1].submenu.unshift({ titulo: 'Usuarios', url: '/usuarios' })
    }


    return menu;
}


module.exports = app;