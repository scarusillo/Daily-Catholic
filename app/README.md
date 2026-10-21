# iPhone & Android app

The app is the same website, packaged with [Capacitor](https://capacitorjs.com) so it can be
listed in the App Store and Google Play. Nothing here has to be rewritten for the app.

## Build it (on a Mac for iOS; any computer for Android)

    python3 scripts/build_web.py          # makes dist/
    cd app
    npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/local-notifications
    npx cap add ios && npx cap add android
    npx cap sync
    npx cap open ios        # opens Xcode → run on a phone or archive for the App Store
    npx cap open android    # opens Android Studio → run or build an .aab for Google Play

## What you need
- Apple Developer Program ($99/year) to publish on the App Store; Xcode on a Mac.
- Google Play Console ($25 one-time) to publish on Google Play.
- A daily-quiz reminder uses @capacitor/local-notifications (no server needed).

## Before submitting
- Apple rejects apps that are "just a website": the daily games, journeys and offline Bible
  count as app functionality, and the local reminder notification helps.
- Have the Catholic content reviewed (see data/REVIEW_LOG.md) before listing it.
