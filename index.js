const { log } = require('@nodebug/logger')
const config = require('@nodebug/config')('chatjs')

log.debug(JSON.stringify(config))
