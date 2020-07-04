/**
 * Website Setup
 * 
 * You must have a blog page on your website that contains the text '#TITLE#' and '#BODY#'
 * This will be used to place post, label or index page titles and content
**/

/**
 * Script Setup
 * 
 * Update the constants below as required for your blog page
**/

// see https://developers.google.com/blogger/docs/3.0/getting_started for how to get your blogid and API Key
const blogid = 'YOUR BLOG ID'
const blogkey = 'YOUR BLOGGER / GOOGLE API KEY'

// baseurl: your website blog page that will be used to display the blogger posts.  Eg 'https://www.example.com/articles'
// Your cloudflare worker script must be on the path defined in basurl and baseurl/*.  
// Eg: 'https://www.example.com/articles' and 'https://www.example.com/articles/*'
const baseurl= 'https://www.example.com/articles'

// swapurl: the blog address or custom domain set in blogger.  The script will swap these references our for baseurl
// Eg: 'https://example-blog.blogspot.com'
const swapurl= 'https://example-blog.blogspot.com'

// labelpath: used in the url path to identify a label request, must start with a forward slash '/'
// Eg: '/label' or '/tag'
const labelpath = '/label'

// pagepath: used in the url path to identify a page request, must start with a forward slash '/'
// Eg: '/page'
const pagepath = '/page'

// nextpageText: text to use for the link to the next page (if the blog posts go across more than one page)
const nextpageText = 'More Articles'

// indextitle: text to use for the title of the index page (and the text for links back to the indext page)
// Eg: 'Our Latest Articles', 'Blog' or 'News'
const indextitle = 'Our Latest Articles'

// defaultlabels: blogger does not expose the labels on the API.  
// The worker script will detect the available labels on an index or post.  
// For index pages, you can add additional labels here
// Eg: const defaultlabels = ['Label 1', 'Label 2', 'Label 3']
const defaultlabels = [
    'Label 1',
    'Label 2',
    'Label 3',
]

/**
 * Main Execution
 * 
 * You should need to change anything below, but may want to tweak the styling, and date formatting
**/

async function handleRequest(req) {

    // declare some variables
    let articleIndex= false
    let frontpage= false
    let nextpage= null
    let articlePage= null
    let articleLabel= null
    let title= null
    let body= null
    let img= null
    let published= null
    let labels= null
    
    // get the website blog page
    let res = await fetch(baseurl, req.headers)

    if(req.url != baseurl && req.url != (baseurl + '/')) {
    // if we're fetching something specific, get it's relative URL
        articlePath = req.url.substring(baseurl.length, req.url.length) 

        if (articlePath.substring(0,labelpath.length)==labelpath) {
            // fetching a label
            articleLabel= articlePath.substring(labelpath.length)
            articleIndex= true
        }
        else if (articlePath.substring(0,pagepath.length)==pagepath) {
            // fetching the next page of the index page
            articlePage= articlePath.substring(pagepath.length)
            articleIndex= true
        }
        else {
            // fetching a specific article or post

            // get the post via the blogger API
            let articleRes= await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogid}/posts/bypath?key=${blogkey}&path=${articlePath}`, req.headers)
            let articleData= await articleRes.json()
            
            title= articleData.title
            body= articleData.content
            img= getImg(body)
            published= fdate(articleData.published)
            labels= articleData.labels
        }
    }
    else {
        // fetching the indext page
        articleIndex= true
        frontpage= true
    }

    if(articleIndex) {
        // we're fetching an index page, index next page or label page
        let articlesRes= null
        let bodycontent= ''
        let itemfirst= true
        let indexlabels= []

        if (frontpage) {
            // index page
            title= indextitle
            articlesRes= await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogid}/posts?key=${blogkey}`, req.headers)
        }
        else if (articlePage) {
            // index next page
            title= indextitle
            articlesRes= await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogid}/posts?key=${blogkey}&pageToken=${articlePage.substring(1)}`, req.headers)
        }
        else {
            // list articles for label 
            title= decodeURI(articleLabel.substring(1))
            articlesRes= await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogid}/posts?key=${blogkey}&labels=${articleLabel.substring(1)}`, req.headers)
        }

        let articlesData= await articlesRes.json()

        if(articlesData.nextPageToken) {
            nextpage=articlesData.nextPageToken
        }

        // iterate over each item that has been retrieved
        for (var item of articlesData.items) {
            // get the first image in the item, so we can use it in the item box
            img=getImg(item.content)

            if(itemfirst && frontpage) {
                // make the first item on the index page a 'hero' item
                if (img) {
                    imgstyle= `height: 300px; background-image: url(${img});`
                }
                    snippetstyle='top: 300px'
                }
            else {
                // it is an ordinary item
                if (img) {
                    imgstyle= `background-image: url(${img});`
                }
                snippetstyle=''
            }

            if (!img) {  // could provide a default image?
                imgstyle='height: 0px;'
                snippetstyle='top: 0px'
            }

            if(item.labels) {  // build up the label list
                indexlabels= indexlabels.concat(item.labels)
            }

            // construct the item body
            bodycontent += `<div class="flex-item">
<a class="flex-item-link" href="${swapUrl(item.url, swapurl, baseurl)}"></a>
<div class="flex-item-img" style="${imgstyle}"></div>
<div class="flex-item-snippet" style="${snippetstyle}">
<p class="article-published">${fdate(item.published)}</p>
<h3 class="flex-item-title">${item.title}</h3> 
<p class="flex-item-content">${getSnippet(item.content, 600)}</p>
</div>
<div class="flex-item-more"><strong>&hellip;</strong></div>
</div>`

            if (itemfirst) {
                // reset as we're moving off the first item
                itemfirst= false;
            }
        }

        body= `<div class="flex-container">${bodycontent}</div>`
        img= null
        published= null

        // join the default labels with those found iterating over the index items, use Set so that we remove duplicates
        labels= Array.from(new Set([
            ...defaultlabels,
            ...indexlabels
        ]))
    }

    if(labels) {
        labels.sort()
    }

    // https://developers.cloudflare.com/workers/reference/apis/html-rewriter/
    // call the generatePage function with the parameters created above
    return new HTMLRewriter().on('*', new generatePage(title, body, img, published, labels, frontpage, nextpage)).transform(res)
}

class generatePage {
    constructor(title, body, img, published, labels, isFront, nextpage) {
        this.title = title
        this.body = body
        this.img= img
        this.published = published

        if (labels) {
            this.labels= labels.map(function(label) { 
                return `<a class="article-label" href="/articles/label/${encodeURI(label)}">${label}</a>`
            })
        }
        else {
            this.labels= null
        }

        this.isFront= isFront
        this.nextpage= nextpage
    }

    element(element) {
        // processing html elements

        // this next block is specific to the google site the cloudflare worker is running on
        // used to change the background image on the top of the page
        if(this.img) { 
            const style= element.getAttribute('style')
            if (style && style.includes('w16383')) { // the default background image
                const newstyle= style.substring(0, style.indexOf('background-image')) + `background-image: url(${this.img});`
                element.setAttribute('style', newstyle)
            }
        }

        // replace the header title
        if (element.tagName=='title') {
            element.replace(`<title>${this.title}</title>`, { html: true })
        }

        // inject some styling 
        if (element.tagName=='head') { 
            element.append(`<style>
    .flex-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-evenly;
        align-content: flex-start;
        align-items: flex-start;
        white-space: normal;
    }

    .flex-item {
        position: relative;
        order: 1;
        flex: 1 1 350px;
        height: 400px;
        background-color: #ffffff;
        transition: .3s box-shadow cubic-bezier(.4,0,.2,1);
        margin: 20px;
        overflow: hidden;
    }

    .flex-item-link {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10;
    }

    .flex-item-link:after {
        content:' ';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%; 
        background: rgba(0,0,0,0.2);
        opacity: 0.2;
        transition: all 0.5s;
        -webkit-transition: all 0.5s;
    }

    .flex-item-link:hover:after {
        opacity: 0;
    }

    .flex-item-img {
        position: absolute;
        top: 0;
        left: 0;
        background-position-x:50%;
        background-position-y:50%;
        background-size:cover;
        display:block;
        width:100%;
        height:200px;
    }

    .flex-item:hover {
        box-shadow: 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12), 0 2px 4px -1px rgba(0,0,0,.2);
    }

    .flex-item-snippet {
        position: relative;
        top: 200px;
        z-index: 1;
        padding-left: 20px;
        padding-right: 20px;
    }

    .flex-item-content {
        background: -webkit-linear-gradient(#000, #eee);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .flex-item-more {
        position: absolute;
        right: 0;
        bottom: 0;
        z-index: 5;
        background: #fff;
        padding: 5px;
    }

    .article-published {
        color: #747474;
        font-style: italic;
        float: right;
    }

    .article-index-link {
        display: inline-block;
        margin-top: 2em;
        border-bottom-color:rgb(33, 33, 33);
        border-bottom-style:solid;
        border-bottom-width:0.996094px;
        text-decoration: none;
        color:rgb(33, 33, 33);
        font-style:normal;
        font-weight:700;
    }

    .article-index-link:hover {
        border-bottom-color: rgba(31,109,188,1);
        border-bottom-style: solid;
        border-bottom-width: 1px;
    }

    .article-label {
        background-color: rgba(10,41,156,.1);
        border-radius: 2px;
        color: #0a299c;
        cursor: pointer;
        display: inline-block;
        font: 500 10.5px Ubuntu, sans-serif;
        line-height: 1.5;
        margin: 4px 4px 4px 0;
        padding: 4px 8px;
        text-transform: uppercase;
        vertical-align: middle;
        text-decoration: none;
    }
</style>`, { html: true })

            if (this.isFront) {   
            // present the first child (latest article) as a full width 'hero' item
                element.append(`<style>
    .flex-item:first-child {
        order: 0;
        flex: 1 1 100%;
        align-self: auto;
        height: 500px;
    }
</style>`, { html: true })
            }
        }
    }

    text(chunk) {
        // processing text chunks
        if (chunk.text=='#TITLE#') {
            // inject the Title
            chunk.replace(this.title)
        }
        if (chunk.text=='#BODY#') {
            // inject the content
            chunk.replace(this.body, { html: true })
            if(this.published) {
                // published date
                chunk.before(`<div class="article-published">${this.published}</div>`, { html: true })
            }
            if (this.isFront && this.nextpage) {
                // a next page link, if required
                chunk.after(`<a class="article-index-link" href="${baseurl}/page/${this.nextpage}">${nextpageText}</a>`, { html: true })
            }
            if (!this.isFront) {
                // a link back to the main index, if required
                chunk.after(`<a class="article-index-link" href="${baseurl}">${indextitle}</a>`, { html: true })
            }
            if(this.labels) {
                // the linked labels
                chunk.after(`<div class="article-labels">${this.labels.join(" ")}</div>`, { html: true })
            }
        }
    }
}

addEventListener('fetch', event => {
    // using passThroughOnException so that local 404 is generated should there be an error on this script
    event.passThroughOnException()

    event.respondWith(handleRequest(event.request))
})

/**
 * Helper functions
**/

// swap URL from swapurl to baseurl (assumes url starts with surl and this is swapped with burl)
function swapUrl(url, surl, burl) {
    return (burl + '/' + url.substring(surl.length, url.length))
}

// Use regular expression (as DOM Parsing not available) to get a content snippet
// removing html tags, trimming to len characters and then to the last full sentenct
function getSnippet(content, len) {
    let c= content.replace(/(&nbsp;|<([^>]+)>)/ig, " ")
    c= c.trim()
    c= c.substring(0,len)
    c= c.substring(0, Math.max(c.lastIndexOf("!"), c.lastIndexOf("?"), c.lastIndexOf(".")+1)) // trim to a whole sentence

    return c
}

// Use regular expressions (as DOM Parsing not available) to get src of first image from content
function getImg(content) {
    let src= null
    const re = /\ssrc=(?:(?:'([^']*)')|(?:"([^"]*)")|([^\s]*))/i // match src='a' OR src="a" OR src=a
    let match = content.match(re)

    if(match) {
        src = match[1]||match[2]||match[3]; // get the one that matched
    } 

    return src
}

// Date functions - UK English centric
function getNumberWithOrdinal(n) {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fdate(ds) {
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'June',
        'July',
        'Aug',
        'Sept',
        'Oct',
        'Nov',
        'Dec'
    ]

    const d = new Date(ds)
    const year = d.getFullYear()
    const month = months[d.getMonth()]
    const date = getNumberWithOrdinal(d.getDate())

    return `${date} ${month} ${year}`
}
