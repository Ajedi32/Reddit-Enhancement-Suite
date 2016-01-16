addLibrary('mediaHosts', 'derpibooru', {
	name: 'Derpibooru',
	domains: [
		'derpiboo.ru',
		'derpibooru.org',
		'trixiebooru.org',
	],
	pathMatcher: /^\/(?:images\/)?(\d+)$/i,

	detect: function(_href, elem) {
		var mod = modules['showImages'].siteModules['derpibooru'];

		return mod.pathMatcher.test(elem.pathname);
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

	fetchImageData: function(imageID) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		var apiURL = 'https://' + mod.domains[0] + '/' + imageID + '.json';

		mod.fetchJSON(apiURL).then(function(json) {
			if (json.image) {
				def.resolve(json);
			} else {
				if (json.duplicate_of) {
					apiURL = 'https://' + mod.domains[0] + '/' + json.duplicate_of + '.json';

					mod.fetchJSON(apiURL).then(function(json) {
						def.resolve(json);
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

	fetchMultipleImageDataIgnoringDups: function(imageIDs) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		var searchParam = imageIDs.map(function(imageID) {
			return 'id_number:' + imageID;
		}).join(' OR ');
		var apiURL = 'https://' + mod.domains[0] + '/search.json?sbq=' + encodeURIComponent(searchParam);

		mod.fetchJSON(apiURL).then(function(json) {
			if (json.search && json.total) {
				// Format results to make lookup by id easier
				var results = {};
				json.search.forEach(function(imageData) {
					results[imageData.id_number] = imageData;
				});
				results.total = json.total;

				def.resolve(results);
			} else {
				def.reject();
			}
		}, function() {
			def.reject();
		});

		return def.promise();
	},

	fetchMultipleImageData: function(imageIDs, deferreds) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		// An object containing deferred objects which will be resolved or rejected
		// depending on the result of the request for their corresponding image, as
		// those results become avaliable. (Unlike the promise returned by this
		// function, which only resolves once all image data is fetched.)
		if (deferreds === undefined) deferreds = {};

		mod.fetchMultipleImageDataIgnoringDups(imageIDs).then(function(results) {
			var missingImageIDs = [];
			imageIDs.forEach(function(imageID) {
				if (results[imageID]) {
					if (deferreds[imageID]) {
						deferreds[imageID].resolve(results[imageID]);
					}
				} else {
					missingImageIDs.push(imageID);
				}
			});

			if (missingImageIDs.length === 0) {
				def.resolve(results);
			} else {
				// The search API for Derpibooru ignores images which were marked as
				// duplicates, and images which are hidden by Derpibooru's default
				// filter, so here we fetch the data for those images individually
				// instead.
				var requests = [];
				missingImageIDs.forEach(function(imageID) {
					var imageDataRequest = mod.fetchImageData(imageID);
					requests.push(imageDataRequest);

					imageDataRequest.then(function(imageData) {
						results[imageData.id_number] = imageData;
						if (deferreds[imageID]) deferreds[imageID].resolve(imageData);
					}, function() {
						if (deferreds[imageID]) deferreds[imageID].reject();
					});
				});

				// After all deferreds are resolved...
				$.when.apply($, requests).then(function() {
					def.resolve(results);
				}, function() {
					def.reject();
				});
			}
		}, function() {
			def.reject();
		});

		return def.promise();
	},

	deferredImageRequests: [],
	batchDebounceTime: 250,
	batchMaxSize: 15,

	doFetchBatch: function() {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var imageIDs = [];
		var deferreds = {};
		mod.deferredImageRequests.forEach(function(deferredImageRequest) {
			imageIDs.push(deferredImageRequest.imageID);
			deferreds[deferredImageRequest.imageID] = deferredImageRequest.deferred;
		});

		mod.fetchMultipleImageData(imageIDs, deferreds);
		mod.deferredImageRequests = [];
	},
	batchFetchImageData: function(imageID) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		mod.deferredImageRequests.push({
			deferred: def,
			imageID: imageID
		});

		var debounceName = 'showImages.derpibooru.doFetchBatch';
		if (mod.deferredImageRequests.length == mod.batchMaxSize) {
			clearTimeout(RESUtils.debounceTimeouts[name]);
			delete RESUtils.debounceTimeouts[name];
			mod.doFetchBatch();
		} else {
			RESUtils.debounce(debounceName, mod.batchDebounceTime, mod.doFetchBatch);
		}

		return def.promise();
	},

	handleLink: function(elem) {
		var mod = modules['showImages'].siteModules['derpibooru'];
		var def = $.Deferred();

		var imageID = mod.pathMatcher.exec(new URL(elem.href).pathname)[1];

		mod.batchFetchImageData(imageID).then(function(json) {
			def.resolve(elem, json);
		}, function() {
			def.reject();
		});

		return def.promise();
	},

	handleInfo: function(elem, info) {
		elem.type = 'IMAGE';
		elem.src = info.image;
		if (info.description) elem.caption = info.description;

		return $.Deferred().resolve(elem).promise();
	}
});
