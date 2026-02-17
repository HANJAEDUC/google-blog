const https = require('https');

const urls = [
    // Broken image (from JSON)
    "https://dm.emea.cms.aldi.cx/is/image/aldiprodeu/product/jpg/scaleWidth/232/57584d01-776a-4a7a-9783-01d3f1ccee5f/Schoko%20Milch%20Riegel%20200%20g",
    // Working image (Aperol)
    "https://dm.emea.cms.aldi.cx/is/image/aldiprodeu/product/jpg/scaleWidth/232/7a762803-6fe7-4c4c-ab12-11372165a2a2/Aperol%2011%20%25%20700ml"
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`URL: ${url}`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        console.log('---');
    }).on('error', (e) => {
        console.error(e);
    });
});
