#!/usr/bin/env node

const fs = require('fs')

let file = fs.readFileSync('./test-scene.pur')
let file2 = fs.readFileSync('./test-scene-rot-90.pur')
let file3 = fs.readFileSync('./test-scene-rot-90-2item.pur')
// file3 = fs.readFileSync('./../PhotoBookCollection.pur')

let filepath = './../PhotoBookCollection-test-link.pur'

const getBinary = (graphPath, asBuffer = false, cb) => {
    let results = []
    let readStream = fs.createReadStream(graphPath, {highWaterMark: 128 * 1024 * 8})
    let data = ''
    let pos = 0
    let phase = 0
    // set stream encoding to binary so chunks are kept in binary
    let offset = 108
    let offsetReal = 108
    let numImages = 0
    readStream.setEncoding('binary')
    readStream.once('error', err => {
      return cb(err)
    })
    let count = 0
    readStream.on('data', chunk => { 
        data += chunk
        let currentOffset = offset + pos
        pos += chunk.length
        let buf = Buffer.from(data, 'binary')
        let view = new DataView(toArrayBuffer(buf))
        if ( phase == 0 ) {
            let numItems = view.getUint32(offset)
            offset += 8
            let bounds = []
            for( let i = 0; i < 4; i++) {
                bounds.push(view.getFloat64(offset))
                offset += 8
            }
            console.log(`numItems: ${numItems}`)
            console.log(`canvas bounds: ${bounds}`)
            
            // offset = 144
            console.log('----camera projection matrix----')
            let startOffset = offset
            let matrix = []
            for( let i = 0; i < 9; i++) {
                matrix.push(view.getFloat64(offset))
                offset += 8
            }
            offset -= 8
            
            console.log('----translation----')
            let translation = []
            offset += Int32Array.BYTES_PER_ELEMENT * 2
            // console.log(offset, view.getInt32(offset, false))
            translation.push(view.getInt32(offset, false))
            offset += Int32Array.BYTES_PER_ELEMENT
            // console.log(offset, view.getInt32(offset, false))
            translation.push(view.getInt32(offset, false))
            console.log(translation)
            // offset += 4
            data = data.slice(offset)
            offsetReal = offset
            offset = 0
            console.log(`actual offset is ${offsetReal}`)
            phase = 1
        }
        if(phase == 1){
            offset = 0
            buf = Buffer.from(data, 'binary')
            view = new DataView(toArrayBuffer(buf))
            while(view.getUint32(offset, true) === 1196314761){
                // console.log('png:')
                offset += 4
                while(true){ // IEND
                    offset += 4
                    let len
                    let type
                    try {
                        if (offset < buf.length) {
                            len = view.getUint32(offset, false)
                        } else  {
                            throw new Error(`out of bounds len=${buf.length} tried ${offset}`)
                        }
                        offset += 4
                        if ( buf.length <= offset + 4 ) {
                            throw new Error(`out of bounds len=${buf.length} tried ${offset + 4}`)
                        }
                        // type = String.fromCharCode.apply(null, buf.slice(offset, offset + 4))
                        type = view.getUint32(offset, true)
                        offset += len + 4
                    } catch(e) {
                        // console.log(e)
                        return
                    }
                    // if (type == 'IEND') break
                    if (type == 1145980233) break
                }
                offset += 4 // delimiter? ae 42
                offsetReal += offset
                // console.log(`actual offset is ${offsetReal}`)
                console.log('png end', offsetReal)
                data = data.slice(offset)
                offset = 0
                numImages++
                console.log(`numFound: ${numImages}`)
                buf = Buffer.from(data, 'binary')
                view = new DataView(toArrayBuffer(buf))
                if (view.getUint32(offset, true) === 1196314761) {
                    return
                }
            }
            phase = 2
            console.log(`png array ended ${offset} found ${numImages} embedded`)
        } 
        if (phase ==2) {
            console.log('hhhhhhhhhh',offset, offsetReal)
            buf = Buffer.from(data, 'binary')
            view = new DataView(toArrayBuffer(buf))
            let startingOffset = offset
            while(true){
                let chunk = 0
                try {
                while(chunk < 100 || chunk==4294967295) {
                    chunk = view.getUint32(offset, false)
                    offset += Uint32Array.BYTES_PER_ELEMENT
                }
                chunk -= offsetReal
                // console.log(chunk, buf.byteLength)
                if ( chunk > buf.byteLength || chunk < 0) {
                    offset -= Uint32Array.BYTES_PER_ELEMENT
                    offset -= Uint32Array.BYTES_PER_ELEMENT
                    break
                }

                let textLen = view.getUint32(offset, false)
                offset += Uint32Array.BYTES_PER_ELEMENT
                let result = convertToString(buf, textLen, offset)
                let instanceName = result[0]
                offset = result[1]
                // console.log(instanceName)
                offset +=2
                textLen = view.getUint16(offset, false)
                offset += 2
                result = convertToString(buf, textLen, offset)
                let filePath = result[0]
                offset = result[1]
                console.log(filePath)
                offset +=2
                textLen = view.getUint16(offset, false)
                // console.log(textLen)
                result = convertToString(buf, textLen, offset)
                let itemName = result[0]
                offset = result[1]
                console.log('----item matrix----')
                offset += 2
                // startOffset = offset
                let matrix = []
                for( let i = 0; i < 9; i++) {
                    offset += 8
                    matrix.push(view.getFloat64(offset))
                }
                console.log(matrix)
                offset += 4
                offset += 8
                // console.log('----crop matrix?----')
                matrix = []
                // startOffset = offset
                for( let i = 0; i < 9; i++) {
                    offset += 8
                    // console.log(offset, view.getFloat64(offset))
                    matrix.push(view.getFloat64(offset))
                }
                // console.log(`num byte: ${offset - startOffset}`)
                // console.log(matrix)
                offset += 4
                // console.log(offset, view.getInt32(offset, false))
                offset += 4 
                // console.log(offset, view.getInt32(offset, false))
                // startOffset = offset
                for( let i = 0; i < 7; i++) {
                    offset += 8
                    // console.log(offset, view.getFloat64(offset))
                }
                offset += 4
                // console.log(offset, view.getInt32(offset, false))
                offset += 4
                // console.log(offset, view.getInt32(offset, false))
                offset += 4
                for( let i = 0; i < 2; i++) {
                    // console.log(offset, view.getFloat64(offset))
                    offset += 8
                }
                // offset += 4
                // offset -= 4
                offset +=4
                let _width = view.getFloat64(offset)
                console.log(offset, _width)
                offset += 8
                let _height = view.getFloat64(offset)
                console.log(offset,_height)
                results.push({
                    file: unicodeToChar(filePath).toString('utf-8'),
                    matrix: matrix,
                    size: [_width * -2, _height * -2]
                })
                // console.log(f.slice(offset, offset + 29))
                // offset += 29
                // // console.log(`num byte: ${offset - startOffset}`)
                // console.log(offset)
                // offset += 747 - 694 + 4
                // console.log(offset)
                // offset += instanceHeaderSize]
                let delta = chunk - offset
                offset += delta
                } catch( e ) {
                    startingOffset = startingOffset
                }
                // console.log(offset)
            }
        }

    })
    readStream.on('end', () => {
        let txt = unescapeUnicode(JSON.stringify(results))
        console.log(txt)
        // fs.writeFileSync('./positions.json', txt, 'utf-8')
      return cb(null, asBuffer ? Buffer.from(data, 'binary') : data)
    })
  }

// getBinary('./test-scene-rot-90-2item.pur', true, (err, binary) => {
//     console.log(binary)
// })


getBinary(filepath, true, (err, binary) => {
    console.log(binary)
})
return


let results = []
let f = file3
let view = new DataView(toArrayBuffer(f))
let offset = 108
let numItems = view.getUint32(offset)
offset += 4
let bounds = []
for( let i = 0; i < 4; i++) {
    bounds.push(view.getFloat64(offset))
    offset += 8
}
console.log(`numItems: ${numItems}`)
console.log(`canvas bounds: ${bounds}`)
// return

// offset = 144
console.log('----camera projection matrix----')
let startOffset = offset
let matrix = []
for( let i = 0; i < 9; i++) {
    matrix.push(view.getFloat64(offset))
    offset += 8
}
console.log(matrix)
offset -= 8

console.log('----translation----')
let translation = []
offset += Int32Array.BYTES_PER_ELEMENT * 2
// console.log(offset, view.getInt32(offset, false))
translation.push(view.getInt32(offset, false))
offset += Int32Array.BYTES_PER_ELEMENT
// console.log(offset, view.getInt32(offset, false))
translation.push(view.getInt32(offset, false))
console.log(translation)
offset += 4
let numImages = 0
console.log(view.getUint32(offset, true))
while(view.getUint32(offset, true) === 1196314761){
    console.log('png:')
    offset += 4
    let chunk = null
    chunk += 4
    while(true){ // IEND
        offset += 4
        let len = view.getUint32(offset, false)
        offset += 4
        let type = String.fromCharCode.apply(null, f.slice(offset, offset + 4))
        offset += len + 4
        // console.log(`len: ${len} type: ${type}`)
        if (type == 'IEND') break
    }
    console.log('png end', offset)
    offset += 4 // delimiter? ae 42
    console.log(offset)
    numImages++
}
console.log(`png array ended ${offset} found ${numImages} embedded`)
// chunk = 0
// while(chunk === 0) {
//     chunk = view.getUint32(offset, false)
//     console.log('chunk', offset, chunk)
//     offset += 4
//     numImages++
// }
// numImages -= 2
// console.log('numImages', numImages)
// offset += 2

while(offset < f.byteLength){
    let chunk = 0
    while(chunk < 100) {
        chunk = view.getUint32(offset, false)
        offset += Uint32Array.BYTES_PER_ELEMENT
    }
    // console.log('end of instance', chunk)
    if ( chunk > f.byteLength ) {
        // console.log(chunk, f.byteLength)
        offset -= Uint32Array.BYTES_PER_ELEMENT
        offset -= Uint32Array.BYTES_PER_ELEMENT
        // console.log(offset)
        break
    }

    // if ( numB > 0 ) {
    //     offset -= Uint32Array.BYTES_PER_ELEMENT
    //     break
    // }


    let textLen = view.getUint32(offset, false)
    offset += Uint32Array.BYTES_PER_ELEMENT
    let result = convertToString(f, textLen, offset)
    let instanceName = result[0]
    offset = result[1]
    // console.log(instanceName)
    offset +=2
    textLen = view.getUint16(offset, false)
    offset += 2
    result = convertToString(f, textLen, offset)
    let filePath = result[0]
    offset = result[1]
    console.log(filePath)
    offset +=2
    textLen = view.getUint16(offset, false)
    // console.log(textLen)
    result = convertToString(f, textLen, offset)
    let itemName = result[0]
    offset = result[1]
    console.log('----item matrix----')
    offset += 2
    startOffset = offset
    matrix = []
    for( let i = 0; i < 9; i++) {
        offset += 8
        matrix.push(view.getFloat64(offset))
    }
    results.push({
        file: unicodeToChar(filePath).toString('utf-8'),
        matrix: matrix
    })
    console.log(matrix)
    offset += 4
    offset += 8
    // console.log('----crop matrix?----')
    matrix = []
    startOffset = offset
    for( let i = 0; i < 9; i++) {
        offset += 8
        // console.log(offset, view.getFloat64(offset))
        matrix.push(view.getFloat64(offset))
    }
    // console.log(`num byte: ${offset - startOffset}`)
    // console.log(matrix)
    offset += 4
    // console.log(offset, view.getInt32(offset, false))
    offset += 4 
    // console.log(offset, view.getInt32(offset, false))
    startOffset = offset
    for( let i = 0; i < 7; i++) {
        offset += 8
        // console.log(offset, view.getFloat64(offset))
    }
    offset += 4
    // console.log(offset, view.getInt32(offset, false))
    offset += 4
    // console.log(offset, view.getInt32(offset, false))
    offset += 4
    for( let i = 0; i < 2; i++) {
        // console.log(offset, view.getFloat64(offset))
        offset += 8
    }
    // offset += 4
    // offset -= 4
    offset +=4
    console.log(offset, view.getFloat64(offset))
    offset += 8
    console.log(offset, view.getFloat64(offset))
    // console.log(f.slice(offset, offset + 29))
    // offset += 29
    // // console.log(`num byte: ${offset - startOffset}`)
    // console.log(offset)
    // offset += 747 - 694 + 4
    // console.log(offset)
    // offset += instanceHeaderSize]
    let delta = chunk - offset
    offset += delta
    // console.log(offset)
}

console.log()
let len = view.getInt32(offset, false)
offset += 4
let name = convertToString(f, len, offset)
// console.log(name[0])
// console.log(f.slice(name[1], f.length))
    
    // console.log(offset, view.getUint16(offset, false))
// }


function convertToString(f, len, offset) {
    let utf8decoder = new TextDecoder(); // default 'utf-8' or 'utf8'
    let t = ''
    let _offset = offset
    for( let i = 0; i <= len; i += 2) {
        t += utf8decoder.decode(f.slice(_offset, _offset + 2))
        _offset += 2
    }

    // t = unicodeToChar(t)
    _offset -= 2
    return [t, _offset]
}



// console.log(view.getFloat32(0x90 + 0x6))

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0)) // camera 
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))
// offset += 0x4
// console.log(file2.slice(offset, offset + 0x4).readFloatBE(0))

// console.log(file.slice(112, 224).toString())
console.log('------------------------')
// console.log(file2.slice(offset, offset+ 10 ).toString())
// console.log(file2.slice(0, 224).toString())

    function unicodeToChar(text) {
        return text.replace(/\\u[\dA-F]{4}/gi, 
               function (match) {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
               });
     }
     
function decode_utf8(s) {
    return decodeURIComponent(escape(s));
}

function unescapeUnicode( str ) {
    return str.replace( /\\u([a-fA-F0-9]{4})/g, function(g, m1) {
         return String.fromCharCode(parseInt(m1, 16));
    });
}


function utf8Decode(utf8String) {
    if (typeof utf8String != 'string') throw new TypeError('parameter ‘utf8String’ is not a string');
    // note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
    const unicodeString = utf8String.replace(
        /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
        function(c) {  // (note parentheses for precedence)
            var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | ( c.charCodeAt(2)&0x3f);
            return String.fromCharCode(cc); }
    ).replace(
        /[\u00c0-\u00df][\u0080-\u00bf]/g,                 // 2-byte chars
        function(c) {  // (note parentheses for precedence)
            var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
            return String.fromCharCode(cc); }
    );
    // console.log(unicodeString)
    return unicodeString;
}
// console.log(txt)
let txt = unescapeUnicode(JSON.stringify(results))
fs.writeFileSync('./positions.json', txt, 'utf-8')