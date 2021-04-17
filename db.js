const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
	logging: false,
};

const { sign, verify } = require('jsonwebtoken');
const { hash, compare } = require('bcryptjs');

if (process.env.LOGGING) {
	delete config.logging;
}
const conn = new Sequelize(
	process.env.DATABASE_URL || 'postgres://localhost/acme-db',
	config
);

const User = conn.define('user', {
	username: STRING,
	password: STRING,
});

User.beforeCreate(async user => {
	user.password = await hash(user.password, 12);
	return user;
});

User.byToken = async token => {
	try {
		const { userId } = verify(token, process.env.MY_JWT_SECRET);

		const user = await User.findByPk(userId);
		if (user) {
			return user;
		}
		const error = Error('bad credentials');
		error.status = 401;
		throw error;
	} catch (ex) {
		const error = Error('bad credentials');
		error.status = 401;
		throw error;
	}
};

User.authenticate = async ({ username, password }) => {
	const user = await User.findOne({
		where: {
			username,
		},
	});

	const ok = await compare(password, user.password);

	if (ok) {
		return sign({ userId: user.id }, process.env.MY_JWT_SECRET);
	}
	const error = Error('bad credentials');
	error.status = 401;
	throw error;
};

/* Note */

const Note = conn.define('note', {
	text: STRING,
});

/* Associations */
Note.belongsTo(User);
User.hasMany(Note);

const syncAndSeed = async () => {
	await conn.sync({ force: true });
	const credentials = [
		{ username: 'lucy', password: 'lucy_pw' },
		{ username: 'moe', password: 'moe_pw' },
		{ username: 'larry', password: 'larry_pw' },
	];
	const [lucy, moe, larry] = await Promise.all(
		credentials.map(credential => User.create(credential))
	);

	const notes = [
		{ text: 'hello world' },
		{ text: 'reminder to buy groceries' },
		{ text: 'reminder to do laundry' },
	];

	const [note1, note2, note3] = await Promise.all(
		notes.map(note => Note.create(note))
	);

	await lucy.setNotes(note1);
	await moe.setNotes([note2, note3]);

	return {
		users: {
			lucy,
			moe,
			larry,
		},
	};
};

module.exports = {
	syncAndSeed,
	models: {
		User,
		Note,
	},
};
