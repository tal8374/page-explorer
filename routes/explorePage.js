var express = require('express');
var router = express.Router();

const { runExplorer } = require('../controllers/explorePage');

/* GET users listing. */
router.get('/', async function (req, res, next) {
  try {
    await runExplorer(req.body.url);
    res.send('respond with a resource');
  } catch (error) {
    res.send(error.toString());
  }
});

module.exports = router;
