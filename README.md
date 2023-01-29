
This project is web app which allows users to easily control their Spotify playback using Spotify's API in a window designed to be resized and displayed on the side of the screen.

Features include:
-viewing current playback
-controling playback (pause/resume, play next/previous)
-playing a user's playlists
-seaching Spotify within the app
-setting a custom color theme for the app
-re-aligning elements within the app

Unfortunatly Spotify's API only allows for playback features to be used by premium accounts, so while the app will still load for non-premium accounts, it won't be useful for much more than displaying playback.



If you are some stranger on the internet wanting to use this app for yourself, you'll first have to create your own application at https://developer.spotify.com/dashboard. Either choose your own redirectURI for the app, or use https://nathancioppa.github.io/spotify-app.html. Then, use that app's Client ID in the first link in index.html instead of mine. If you change the redirectURI, also change that in the first link in index.html. Once you have the authorization token, the app should load properly without any other changes. Once you've downloaded the app you could obvioulsy make other
changes if you want, but good luck navigating the thousand line js file! :)
