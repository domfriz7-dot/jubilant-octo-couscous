/**
 * Expo config plugin — removes the `android:extractNativeLibs` attribute from
 * AndroidManifest.xml.  Some Expo/RN packages set extractNativeLibs="true",
 * which conflicts with Play Store requirements that target Android 6+ (API 23+)
 * and with profiling/split-APK delivery on newer Gradle versions.
 *
 * Removing the attribute lets the OS default (false on API 23+) take effect,
 * which is correct for release AAB builds.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @returns {import('@expo/config-plugins').ExpoConfig}
 */
module.exports = function withRemoveEnableBundleCompression(config) {
  return withAndroidManifest(config, (modConfig) => {
    const { manifest } = modConfig.modResults;
    const applications = manifest?.application;
    if (Array.isArray(applications) && applications.length > 0) {
      const app = applications[0].$;
      if (app) {
        delete app['android:extractNativeLibs'];
      }
    }
    return modConfig;
  });
};
