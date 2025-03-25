require("dotenv").config()


console.log(process.pid)
var Imap = require('imap'),
    inspect = require('util').inspect;


var imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_SERVER,
  port: 993,
  tls: true
});

const mailboxName = "INBOX"
//const mailboxName = "Traités"

function openInbox(cb) {
  imap.openBox(mailboxName, true, cb);
}

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    imap.closeBox(function(err) {
      imap.end()
    })
});


imap.once('ready', function() {

  openInbox(function(err, box) {
    if (err) throw err;

    imap.search(['ALL'], function(err, results) {
      if (err) throw err;
      console.log(results)
      var f = imap.fetch(results[0], {
        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', '2'],
        struct: true
      });

      f.on('message', function(msg, seqno) {
        console.log('Message #%d', seqno);
        var prefix = '(#' + seqno + ') ';
        msg.on('body', function(stream, info) {
          console.log(info)
          var buffer = '';
          stream.on('data', function(chunk) {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', function() {
            console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
            console.log(prefix + 'Parsed header: %s', buffer);
          });
        });
        msg.once('attributes', function(attrs) {
          console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
        });
        msg.once('end', function() {
          console.log(prefix + 'Finished');
        });
      });
      f.once('error', function(err) {
        console.log('Fetch error: ' + err);
      });
      f.once('end', function() {
        console.log('Done fetching all messages!');
        imap.end();
      });//*/
    })
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.once('close', function() {
  console.log('Connection closed');
});

imap.connect();