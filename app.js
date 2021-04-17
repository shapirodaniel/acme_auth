const express = require('express');
const app = express();
app.use(express.json());
const {
	models: { User, Note },
} = require('./db');
const path = require('path');
const { verify } = require('jsonwebtoken');

// add public dir and express static middleware + path
app.use(express.static(path.join('public')));

const requireToken = async (req, res, next) => {
	try {
		const token = req.headers.authorization;
		const user = await User.byToken(token);
		req.user = user;
		next();
	} catch (err) {
		next(err);
	}
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
	try {
		res.send({ token: await User.authenticate(req.body) });
	} catch (ex) {
		next(ex);
	}
});

app.get('/api/auth', requireToken, async (req, res, next) => {
	try {
		res.send(await User.byToken(req.headers.authorization));
	} catch (ex) {
		next(ex);
	}
});

app.get('/api/users/:userId/notes', requireToken, async (req, res, next) => {
	try {
		// grab userId from params
		const { userId } = req.params;

		console.log(req.user);

		if (+userId === +req.user.id) {
			res.send(
				await Note.findAll({
					where: {
						userId,
					},
				})
			);
		}
	} catch (err) {
		next(err);
	}
});

app.use((err, req, res, next) => {
	console.log(err);
	res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
