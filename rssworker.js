/**
 * RSS.XML Feed rewriter
 * 
 * Simple worker script to take the blogger rss.xml feed and rewrite it to point to the posts on your website (converted by the worker.js script)
 * Add this worker to your /rss.xml path
**/

// newurl: your website blog page that is used to display the blogger posts.  Eg 'https://www.example.com/articles'
const newurl= 'https://www.example.com/articles'

// oldurl: the blogger address or custom domain set in blogger.  The script will swap these references our for baseurl
// Eg: 'https://example-blog.blogspot.com'
const oldurl= 'https://example.blogspot.com'

// xmlfilename: the rss.xml file name to use - there should be no reason to change this from 'rss.xml'
const xmlfilename= '/rss.xml'

addEventListener('fetch', event => {
  event.passThroughOnException()  
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(req) {
  // get the blogger feed
  let bloggerres = await fetch(oldurl+xmlfilename, req.headers)

  // process bloggerres.body
  let blogbody = await bloggerres.text()
  let body= blogbody.split(oldurl).join(newurl)

  let response = new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: bloggerres.headers,
  })

  return response
}
