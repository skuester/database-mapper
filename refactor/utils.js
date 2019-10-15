
function prefixer(prefix) {
	return (str) => prefix + str
}


function TableEnum() {
	var count = 0
	return function next() {
		return 't' + (count += 1)
	}
}




module.exports = {
	TableEnum,
	prefixer
}