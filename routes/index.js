var express = require('express');
var utility = require('utility');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var url = require('url');
var async = require('async');


var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  // var q = req.query.q;
  // var mdtValue = utility.md5(q);
  //
  // res.send('the numbeer is:'+mdtValue)
  res.render('index', { title: 'Express' });
});

router.get('/bug', function (req, res) {

    // 网络爬虫 : get cnode website some topic and url
    superagent.get('https://cnodejs.org').end(function (err, sres) {
        if (err){
          res.send('the page has happened some errors');
          return next(err)
        }
        // res.send(sres.text);
        var $ = cheerio.load(sres.text);
        var items = [];
        $('#topic_list .topic_title').each(function (idx, element) {
            var $element = $(element);
            items.push({
                title: $element.attr('title'),
                href: $element.attr('href')
            })
        })
        res.setHeader('Content-Type','text/html;charset=UTF-8')
        res.send(items);

    })
})

/* visit the website of cnode and get some topic and comment form its first page of index
* study use eventproxy to achive ask of proxy if there are lots of asking
* */
router.get('/eventProxy', function (req, res) {

    superagent.get('http://cnodejs.org').end(function (err, sres) {
        if (err){
            res.send('the page has happened some err!!!');
            return next(err);
        }

        var topicUrls = [] , $ = cheerio.load(sres.text);

        $('#topic_list .topic_title').each(function (idx, element) {
            var $element = $(element);
            var href = url.resolve('http://cnodejs.org', $element.attr('href'));
            topicUrls.push(href);
        })

        // res.setHeader('Content-Type','text/html;charset=UTF-8');
        // res.send(topicUrls)

        /*begin to achive high proxy*/
        var eq = new eventproxy();

        eq.after('top_html', topicUrls.length, function (topics) {

            topics = topics.map(function (topicPair) {
                var topicUrl = topicPair[0];
                var topicHtml = topicPair[1];
                var $ = cheerio.load(topicHtml);

                return({
                    title: $('.topic_full_title').text().trim(),
                    href: topicUrl,
                    comment: $('.reply_content').eq(0).text().trim()
                })
            })

            res.setHeader('Content-Type','text/html;charset=UTF-8');
            res.send(topics)
        })

        topicUrls.forEach(function (topicUrl) {
            superagent.get(topicUrl).end(function (err, res) {
                eq.emit('top_html',[topicUrl, res.text])
            })
        })

    })

})

/*async异步处理高并发*/
router.get('/async', function (req, res) {

    var currencyCount = 0;
    var fetchUrl = function (url , callback) {
        var delay = parseInt((Math.random()*10000000)%2000, 10)
        currencyCount ++;
        // res.send('现在并发数是：', currencyCount, ',正在抓取的是：', url, ',耗时:',delay+'毫秒')
        console.log('现在并发数是：', currencyCount, ',正在抓取的是：', url, ',耗时:',delay+'毫秒')
        setTimeout(function () {
            currencyCount --;
            console.log('=================currentnum:',currencyCount)
            console.log('---------------------', callback)
            callback(null, url+' html content');   // callback指向下面maplimit后面的function,当所有并发执行完毕后在执行
        }, delay);

    }

    var urls = [];
    for (var i =0; i<30; i++){
        urls.push('http://datasource_'+i);
    }

    async.mapLimit( urls, 5, function (url, callback) {
        fetchUrl(url, callback)
    },function (err, result) {
        console.log('final:');
        console.log(result);
    })


})




module.exports = router;
