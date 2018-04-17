import { Texture2D, Texture } from 'claygl';

export default function (mesh, img, config) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    var geometry = mesh.geometry;

    geometry.resetOffset();

    var width = canvas.width = Math.round(config.barNumber / img.height * img.width);
    var height = canvas.height = Math.round(config.barNumber);

    ctx.drawImage(img, 0, 0, width, height);
    var imgData = ctx.getImageData(0, 0, width, height);
    var pixelData = imgData.data;

    geometry.bevelSize = config.barBevel;

    var barCount = 0;
    var minLum = Infinity;
    var maxLum = -Infinity;
    for (var i = 0; i < pixelData.length; i += 4) {
        var r = pixelData[i];
        var g = pixelData[i + 1];
        var b = pixelData[i + 2];
        var a = pixelData[i + 3];

        var lum = (0.2125 * r + 0.7154 * g + 0.0721 * b);
        minLum = Math.min(minLum, lum);
        maxLum = Math.max(maxLum, lum);

        if (a > 1) {
            barCount++;
        }
    }
    geometry.setBarCount(barCount);

    var off = 0;

    var size = [config.barSize, 1, config.barSize];
    var start = [0, 0, 0];
    var uv = [0, 0];

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            if (pixelData[off * 4 + 3] <= 1) {
                continue;
            }

            var r = pixelData[off * 4];
            var g = pixelData[off * 4 + 1];
            var b = pixelData[off * 4 + 2];

            var lum = (0.2125 * r + 0.7154 * g + 0.0721 * b);

            start[0] = (x - width / 2) * 1.5;
            start[2] = (y - height / 2) * 1.5;

            size[1] = (lum - minLum) * config.scale / 2 + 0.1;

            uv[0] = x / (width - 1);
            uv[1] = y / (height - 1);
            geometry.addBar(start, size, uv);

            off++;
        }
    }

    geometry.dirty();
    geometry.updateBoundingBox();

    var texture = mesh.material.get('diffuseMap');
    if (!texture) {
        texture = new Texture2D({
            minFilter: Texture.NEAREST,
            magFilter: Texture.NEAREST,
            flipY: false
        });
    }
    texture.image = canvas;
    texture.dirty();
    mesh.material.set('diffuseMap', texture);
}