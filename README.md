cssess
------

cssess is a JS tool that helps find extra CSS rules on your site. It is designed to be used as a bookmarklet.

The name cssess comes from the word secess and is pronounced the same way. secess means withdraw or retreat.

It was inspired by Helium (https://github.com/geuis/helium-css/). cssess has many improvements over Helium:

* Helium depends on querySelectorAll, restricting use to the latest browsers. cssess uses jQuery as a selector engine.
* Helium requires that you add URLs to check manually. cssess will spider all same domain links on the current page.
* Helium was designed to be included within the page using <script>. cssess is designed to be used as a bookmarklet.

To install as a bookmarklet use the following:

javascript:(function(d,t){var j=d.createElement(t),s=d.getElementsByTagName(t)[0]||d.getElementsByTagName("link")[0];j.src='http://driverdan.github.com/cssess/cssess-min.js';s.parentNode.insertBefore(j,s);})(document,"script");

To use the un-minified version replace cssess-min.js with cssess.js.

Notes
-----

* cssess will not work cross-domain due to browser security restrictions.
* Contributions are welcome. Feel free to fork on github and submit a pull request.