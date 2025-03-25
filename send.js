require("dotenv").config()
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASSWORD,
  },
});


// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: process.env.IMAP_USER,
    to: process.env.IMAP_USER,
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
    //inReplyTo: '<0c1273f8-c94d-5a53-dee6-93a3209a283d@alwaysdata.net>',
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>

  const info = await transporter.sendMail({
    from: process.env.IMAP_USER,
    to: process.env.IMAP_USER,
    subject: "World", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
    inReplyTo: info.messageId,
  });
}

main().catch(console.error);
