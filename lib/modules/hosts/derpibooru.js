addLibrary('mediaHosts', 'derpibooru', {
	name: 'Derpibooru',
	domains: [
		'derpiboo.ru',
		'www.derpiboo.ru',
		'derpibooru.org',
		'www.derpibooru.org',
		'trixiebooru.org',
		'www.trixiebooru.org'
	],
	pathMatcher: /^\/\d+$/i,

	detect: function(href, _elem) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		href = new URL(href);

		return mod.domains.indexOf(href.host) != -1 && mod.pathMatcher.test(href.pathname);
	},

	fetchJSON: function(url) {
		var def = $.Deferred();

		RESEnvironment.ajax({
			method: 'GET',
			url: url,
			onload: function(response) {
				var json;
				try {
					json = JSON.parse(response.responseText);
				} catch (error) {
					def.reject();
				}
				def.resolve(json);
			},
			onerror: function(response) {
				def.reject();
			}
		});

		return def.promise();
	},

	handleLink: function(elem) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		var apiURL = new URL(elem.href);
		apiURL.pathname += '.json';

		mod.fetchJSON(apiURL.href).then(function(json) {
			if (json.image) {
				def.resolve(elem, json);
			} else {
				if (json.duplicate_of) {
					apiURL.pathname = '/' + json.duplicate_of + '.json';

					mod.fetchJSON(apiURL.href).then(function(json) {
						def.resolve(elem, json);
					}, function() {
						def.reject();
					});
				} else {
					def.reject();
				}
			}
		}, function() {
			def.reject();
		});

		return def.promise();
	},

	handleInfo: function(elem, info) {
		elem.type = 'IMAGE';
		elem.src = info.image;

		return $.Deferred().resolve(elem).promise();
	}
});
