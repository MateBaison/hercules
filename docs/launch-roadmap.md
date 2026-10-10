# Launch roadmap

Planning requested October 10, 2026. These steps do not authorize domain purchases, paid subscriptions, account registration or a native-app implementation.

1. Define the product scope and shortlist names broad enough to include training and future coaches. Check existing app names and availability of the matching .com domain.
2. Select the final name and reserve the domain in the owner's account.
3. Create the logo, mobile app icon, color palette and final product name in the interface.
4. Connect the domain to Vercel, configure a verified branded sender and support contact, and update authentication site/redirect origins carefully. SMTP remains deferred until the owner provides a provider/domain.
5. Enroll in Apple Developer and Google Play Console using the appropriate owner/account type. These accounts need identity verification and fees; no accounts or payments have been created.
6. Configure public email delivery and Apple sign-in, verify callbacks on web/mobile and test that users retain their accounts and data across sign-in methods.
7. Decide and build the Android/iOS distribution approach. The current project is a hosted Next.js application, not already a signed store package. Review location/background behavior, permissions, sign-in links and native value before submitting a web wrapper.
8. Prepare support, an accessible privacy policy, in-app account deletion, account-data handling and store privacy disclosures, including photos, GPS routes and optional menstrual data.
9. Run a beta on real iPhones and Android phones and with outside testers. New personal Google Play accounts require at least 12 testers continuously opted in for 14 days before applying for production access.
10. Prepare screenshots, descriptions, category, age rating, reviewer access and signed builds; submit for review, resolve feedback and launch.

Sources: https://developer.apple.com/app-store/review/, https://developer.apple.com/support/offering-account-deletion-in-your-app/, https://support.google.com/googleplay/android-developer/answer/6112435 and https://support.google.com/googleplay/android-developer/answer/14151465.

## Future coach discovery

Keep five bottom destinations: Inicio / Explorar / Herramientas / Progreso / Perfil. Explorar contains Ejercicios and Entrenadores tabs. A home shortcut can open coach discovery without a sixth navigation item.

Perfil offers an optional Crear perfil de entrenador entry. A professional can manage that profile in the same area without creating another account or losing personal training features. Public fields may include photo, location, online/in-person mode, specialties, languages, availability and contact method. Personal body measurements, workout history, GPS routes and menstrual data must not become public trainer fields.

Start with discovery, profile details and a contact mechanism; bookings, payments, chat and ratings can follow later. Define profile approval, credential checks and report handling before treating profiles as verified. Do not implement these features from this planning document alone.
