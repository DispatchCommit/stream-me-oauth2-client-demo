var UsersStore = module.exports = {};

var users = {};

/* *
 * UsersStore
 * * *
 *
 * This is an in-memory store of user objects.
 *
 * After a user succesfully logs in and grants permissions to this app, the UsersStore
 * will be updated with the user's id, username, slug, StreamMe accesss token (at), and refresh token (rt).
 *
 * In a typical app, these functions will involve a reading or writing to a database.
 *
 */
UsersStore.save = function (authToken, refreshToken, profile) {
	var userObj = {
		id: profile.id,
		username: profile.username,
		slug: profile._json && profile._json.slug,
		at: authToken,
		rt: refreshToken
	};

	users[profile.id] = userObj;
	return userObj;
};

UsersStore.get = function (id) {
	return users[id];
};

UsersStore.delete = function (id) {
	delete users[id];
};
