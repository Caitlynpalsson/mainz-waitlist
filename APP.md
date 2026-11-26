# The Main Course app

This is a preview. Nobody has signed it, and it is not in the App Store or Google Play.

The website can already be installed. On a phone, open the site, then add it to the home screen. The icon, the cream splash, and a small offline shell come with that.

The iOS and Android projects in `app/ios` and `app/android` are a wrapper around that same website. The name on the phone would be The Main Course. The id is `com.themaincoursemarket.app`. They open Stripe in an in-app browser and come back for a rep link (`/r/CODE`) or a bank-connect return. Push notifications are in the project and switched off.

## What Caty needs later

Apple charges $99 a year for a developer account. That is what lets us sign the iOS app and put it in the App Store. Google charges $25 once for a Play Console account. That is what lets us sign the Android app and put it in the Play Store. We do not have either account yet, so we cannot sign or submit.

When those accounts exist:

1. Build the website with `npm run export:web` inside `app`, then `npx cap sync`.
2. Open the iOS project in Xcode with the Apple account and archive it.
3. Open the Android project in Android Studio with the Google account and build a release.
4. Host Apple's app-link file on themaincoursemarket.com so `/r/CODE` and the Stripe return open the app instead of the browser.
5. Turn push on only after Caty says so. It stays off until then.

No store listing exists today.
