/* @flow */

import { MODULE_PROFILING_KEY, PERF_PROFILING_KEY, RES_DISABLED_KEY } from '../constants/sessionStorage';
import { CACHED_LANG_KEY, CACHED_MESSAGES_KEY, CACHED_MESSAGES_TOKEN_KEY } from '../constants/localStorage';
import { Module } from '../core/module';
import { Alert } from '../utils';
import { Session, Storage, XhrCache, i18n, isPrivateBrowsing, multicast } from '../environment';
import * as Notifications from './notifications';
import * as UserTagger from './userTagger';

export const module: Module<*> = new Module('troubleshooter');

module.moduleName = 'troubleshooterName';
module.alwaysEnabled = true;
module.sort = -7;
module.description = 'troubleshooterDesc';
module.category = 'aboutCategory';
module.options = {
	clearCache: {
		title: 'troubleshooterClearCacheTitle',
		type: 'button',
		text: 'Clear',
		callback: clearCache,
		description: 'troubleshooterClearCacheDesc',
	},
	clearTags: {
		title: 'troubleshooterClearTagsTitle',
		type: 'button',
		text: 'Clear',
		callback: clearTags,
		description: 'troubleshooterClearTagsDesc',
	},
	resetToFactory: {
		title: 'troubleshooterResetToFactoryTitle',
		type: 'button',
		text: 'Reset',
		callback: resetToFactory,
		description: 'troubleshooterResetToFactoryDesc',
	},
	disableRES: {
		title: 'troubleshooterDisableRESTitle',
		type: 'button',
		text: 'Disable',
		callback: disableRES,
		description: 'troubleshooterDisableRESDesc',
	},
	profileStartup: {
		title: 'troubleshooterProfileStartupTitle',
		type: 'button',
		text: 'Enable',
		callback: enablePerfProfiling,
		description: 'troubleshooterProfileStartupDesc',
	},
	profileModules: {
		title: 'troubleshooterProfileModulesTitle',
		type: 'button',
		text: 'Enable',
		callback: enableModuleProfiling,
		description: 'troubleshooterProfileModulesDesc',
	},
	breakpoint: {
		title: 'troubleshooterBreakpointTitle',
		type: 'button',
		text: 'Pause JavaScript',
		callback() {
			debugger; // eslint-disable-line no-debugger
		},
		description: 'troubleshooterBreakpointDesc',
	},
	testNotifications: {
		title: 'troubleshooterTestNotificationsTitle',
		type: 'button',
		text: 'Test notifications',
		callback: testNotifications,
		description: 'troubleshooterTestNotificationsDesc',
	},
	testEnvironment: {
		title: 'troubleshooterTestEnvironmentTitle',
		type: 'button',
		text: 'Test environment',
		callback: testEnvironment,
		description: 'troubleshooterTestEnvironmentDesc',
	},
};

function clearCache() {
	XhrCache.clear();
	Session.clear();
	localStorage.removeItem(CACHED_LANG_KEY);
	localStorage.removeItem(CACHED_MESSAGES_TOKEN_KEY);
	localStorage.removeItem(CACHED_MESSAGES_KEY);
	Notifications.showNotification(i18n('troubleshooterCachesCleared'), 2500);
}

async function clearTags() {
	const confirm = window.confirm(i18n('troubleshooterAreYouPositive'));
	if (confirm) {
		const tags = await UserTagger.tagStorage.getAll();
		const keysToDelete = [];
		for (const [key, { text, votesUp = 0, votesDown = 0 }] of Object.entries(tags)) {
			if (!text && votesUp <= 1 && votesDown <= 1) {
				keysToDelete.push(key);
			}
		}
		UserTagger.tagStorage.delete(keysToDelete);
		Notifications.showNotification(i18n('troubleshooterEntriesRemoved', keysToDelete.length), 2500);
	} else {
		Notifications.showNotification(i18n('troubleshooterNoActionTaken'), 2500);
	}
}

function resetToFactory() {
	const confirm = window.prompt(i18n('troubleshooterThisWillKillYourSettings', 'trash'));
	if (confirm === 'trash' || confirm === '"trash"') {
		clearCache();
		Storage.clear();
		Notifications.showNotification(i18n('troubleshooterSettingsReset'), 2500);
	} else {
		Notifications.showNotification(i18n('troubleshooterNoActionTaken'), 2500);
	}
}

function disableRES() {
	sessionStorage.setItem(RES_DISABLED_KEY, 'true');
	window.location.reload();
}

function enablePerfProfiling() {
	sessionStorage.setItem(PERF_PROFILING_KEY, 'true');
	location.hash = '';
	location.reload();
}

function enableModuleProfiling() {
	sessionStorage.setItem(MODULE_PROFILING_KEY, 'true');
	location.hash = '';
	location.reload();
}

function testNotifications() {
	Notifications.showNotification({
		moduleID: module.moduleID,
		header: 'Template test',
		message: '<p>Hello, FakeUsername</p>',
	});
}

const testMulticast = multicast(val => {
	Alert.open(`Multicast: ${val}`);
}, { name: 'testMulticast', local: false });

async function testEnvironment() {
	const testKey = '__test__';
	const rows = [];

	try {
		let rand;

		rows.push(`Private browsing: ${String(isPrivateBrowsing())}`, '');

		rand = Math.random();
		rows.push(`Sending multicast: ${rand}`, '');
		testMulticast(rand);

		rand = Math.random();
		rows.push(`Storage.set(): ${rand}`);
		Storage.set(testKey, rand);
		rows.push(`Storage.get(): ${(await Storage.get(testKey): any)}`);
		rows.push(`Storage.has(): ${(await Storage.has(testKey): any)}`);
		rows.push('Storage.delete()');
		Storage.delete(testKey);
		rows.push(`Storage.get(): ${(await Storage.get(testKey): any)}`);
		rows.push(`Storage.has(): ${(await Storage.has(testKey): any)}`, '');

		rand = Math.random();
		rows.push(`Session.set(): ${rand}`);
		Session.set(testKey, rand);
		rows.push(`Session.get(): ${(await Session.get(testKey): any)}`);
		rows.push(`Session.has(): ${(await Session.has(testKey): any)}`);
		rows.push('Session.delete()');
		Session.delete(testKey);
		rows.push(`Session.get(): ${(await Session.get(testKey): any)}`);
		rows.push(`Session.has(): ${(await Session.has(testKey): any)}`, '');

		rand = Math.random();
		const wrapped = Storage.wrap(testKey, 'default');
		rows.push(`wrapped.set(): ${rand}`);
		wrapped.set(rand);
		rows.push(`wrapped.get(): ${(await wrapped.get(): any)}`);
		rows.push(`wrapped.has(): ${(await wrapped.has(): any)}`);
		rows.push('wrapped.delete()');
		wrapped.delete();
		rows.push(`wrapped.get(): ${(await wrapped.get(): any)}`);
		rows.push(`wrapped.has(): ${(await wrapped.has(): any)}`, '');

		rand = Math.random();
		const domain = Storage.wrapPrefix(testKey, () => 'default');
		rows.push(`prefix.set(): ${rand}`);
		domain.set('1', rand);
		rows.push(`prefix.get(): ${(await domain.get('1'): any)}`);
		rows.push(`prefix.has(): ${(await domain.has('1'): any)}`);
		rows.push('prefix.delete()');
		domain.delete('1');
		rows.push(`prefix.get(): ${(await domain.get('1'): any)}`);
		rows.push(`prefix.has(): ${(await domain.has('1'): any)}`, '');

		rand = Math.random();
		const blob = Storage.wrapBlob(testKey, () => 'default');
		rows.push(`blob.set(): ${rand}`);
		blob.set('1', rand);
		rows.push(`blob.get(): ${(await blob.get('1'): any)}`);
		rows.push(`blob.has(): ${(await blob.has('1'): any)}`);
		rows.push('blob.delete()');
		blob.delete('1');
		rows.push(`blob.get(): ${(await blob.get('1'): any)}`);
		rows.push(`blob.has(): ${(await blob.has('1'): any)}`, '');
	} catch (e) {
		rows.push('', `Errored: ${e}`);
		console.error(e);
	}

	Alert.open(rows.join('<br>'));
}
