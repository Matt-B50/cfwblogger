# cfwblogger
A simple cloudflare worker script that embeds blogger index and posts into your website.  Simply create a page with the text '#TITLE#' and '#BODY#' in it.  Then configure the worker script to run on your page and any of it's subpages, using your blog ID from Blogger, and your Blogger API Key.

I have used this on a Google Site, where I wanted non-techies the flexibility of a drag and drop site and the convenience of being able to use a blog tool (Blogger) to create articles.  This gives them the use fairly standard / generic tools that are maintained and well documented.  

Cloudflare is then used to manage the DNS and CDN, and this little script brings both the main google Site and the Blogger content together in one place.

More could be done to separate out the styling, add more functionality available from the Blogger API.  This met my use case and I though it would be useful to share.

Matt
