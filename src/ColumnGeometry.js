import { Geometry, dep } from 'claygl';

var vec3 = dep.glmatrix.vec3;

var ColumnGeometry = Geometry.extend(function () {
    return {

        dynamic: true,

        bevelSize: 1,
        bevelSegments: 2,

        _vertexOffset: 0,
        _triangleOffset: 0
    };
},
{

    resetOffset: function () {
        this._vertexOffset = 0;
        this._triangleOffset = 0;
    },

    setBarCount: function (barCount) {
        var vertexCount = this.getBarVertexCount() * barCount;
        var triangleCount = this.getBarTriangleCount() * barCount;

        if (this.vertexCount !== vertexCount) {
            this.attributes.position.init(vertexCount);
            this.attributes.normal.init(vertexCount);
            this.attributes.texcoord0.init(vertexCount);
        }

        if (this.triangleCount !== triangleCount) {
            this.indices = vertexCount > 0xffff ? new Uint32Array(triangleCount * 3) : new Uint16Array(triangleCount * 3);
        }
    },

    getBarVertexCount: function () {
        var bevelSegments = this.bevelSize > 0 ? this.bevelSegments : 0;
        return bevelSegments > 0 ? this._getBevelBarVertexCount(bevelSegments)
            : 24;
    },

    getBarTriangleCount: function () {
        var bevelSegments = this.bevelSize > 0 ? this.bevelSegments : 0;
        return bevelSegments > 0 ? this._getBevelBarTriangleCount(bevelSegments)
            : 12;
    },

    _getBevelBarVertexCount: function (bevelSegments) {
        return (bevelSegments + 1) * 4 * (bevelSegments + 1) * 2;
    },

    _getBevelBarTriangleCount: function (bevelSegments) {
        var widthSegments = bevelSegments * 4 + 3;
        var heightSegments = bevelSegments * 2 + 1;
        return (widthSegments + 1) * heightSegments * 2 + 4;
    },

    /**
     * Add a bar
     * @param {Array.<number>} start
     * @param {Array.<number>} end
     * @param {Array.<number>} orient  right direction
     * @param {Array.<number>} size size on x and z
     * @param {Array.<number>} color
     */
    addBar: (function () {
        var v3Create = vec3.create;
        var v3ScaleAndAdd = vec3.scaleAndAdd;

        var end = v3Create();
        var px = v3Create();
        var py = v3Create();
        var pz = v3Create();
        var nx = v3Create();
        var ny = v3Create();
        var nz = v3Create();

        var pts = [];
        var normals = [];
        for (var i = 0; i < 8; i++) {
            pts[i] = v3Create();
        }

        var cubeFaces4 = [
            // PX
            [0, 1, 5, 4],
            // NX
            [2, 3, 7, 6],
            // PY
            [4, 5, 6, 7],
            // NY
            [3, 2, 1, 0],
            // PZ
            [0, 4, 7, 3],
            // NZ
            [1, 2, 6, 5]
        ];
        var face4To3 = [
            0, 1, 2, 0, 2, 3
        ];
        var cubeFaces3 = [];
        for (var i = 0; i < cubeFaces4.length; i++) {
            var face4 = cubeFaces4[i];
            for (var j = 0; j < 2; j++) {
                var face = [];
                for (var k = 0; k < 3; k++) {
                    face.push(face4[face4To3[j * 3 + k]]);
                }
                cubeFaces3.push(face);
            }
        }
        var px = [1, 0, 0];
        var nx = [-1, 0, 0];
        var py = [0, 1, 0];
        var ny = [0, -1, 0];
        var pz = [0, 0, 1];
        var nz = [0, 0, -1];
        return function (start, size, uv) {
            if (this.bevelSize > 0 && this.bevelSegments > 0) {
                this._addBevelBar(start, size, this.bevelSize, this.bevelSegments, uv);
            }
            else {
                v3ScaleAndAdd(pts[0], start, px, size[0] / 2);
                v3ScaleAndAdd(pts[0], pts[0], pz, size[2] / 2);
                v3ScaleAndAdd(pts[1], start, px, size[0] / 2);
                v3ScaleAndAdd(pts[1], pts[1], nz, size[2] / 2);
                v3ScaleAndAdd(pts[2], start, nx, size[0] / 2);
                v3ScaleAndAdd(pts[2], pts[2], nz, size[2] / 2);
                v3ScaleAndAdd(pts[3], start, nx, size[0] / 2);
                v3ScaleAndAdd(pts[3], pts[3], pz, size[2] / 2);

                v3ScaleAndAdd(end, start, py, size[1]);

                v3ScaleAndAdd(pts[4], end, px, size[0] / 2);
                v3ScaleAndAdd(pts[4], pts[4], pz, size[2] / 2);
                v3ScaleAndAdd(pts[5], end, px, size[0] / 2);
                v3ScaleAndAdd(pts[5], pts[5], nz, size[2] / 2);
                v3ScaleAndAdd(pts[6], end, nx, size[0] / 2);
                v3ScaleAndAdd(pts[6], pts[6], nz, size[2] / 2);
                v3ScaleAndAdd(pts[7], end, nx, size[0] / 2);
                v3ScaleAndAdd(pts[7], pts[7], pz, size[2] / 2);

                var attributes = this.attributes;

                normals[0] = px;
                normals[1] = nx;
                normals[2] = py;
                normals[3] = ny;
                normals[4] = pz;
                normals[5] = nz;

                var vertexOffset = this._vertexOffset;
                for (var i = 0; i < cubeFaces4.length; i++) {
                    var idx3 = this._triangleOffset * 3;
                    for (var k = 0; k < 6; k++) {
                        this.indices[idx3++] = vertexOffset + face4To3[k];
                    }
                    vertexOffset += 4;
                    this._triangleOffset += 2;
                }

                for (var i = 0; i < cubeFaces4.length; i++) {
                    var normal = normals[i];
                    for (var k = 0; k < 4; k++) {
                        var idx = cubeFaces4[i][k];
                        attributes.position.set(this._vertexOffset, pts[idx]);
                        attributes.normal.set(this._vertexOffset, normal);
                        attributes.texcoord0.set(this._vertexOffset++, uv);
                    }
                }
            }
        };
    })(),

    /**
     * Add a bar with bevel
     * @param {Array.<number>} start
     * @param {Array.<number>} end
     * @param {Array.<number>} orient  right direction
     * @param {Array.<number>} size size on x and z
     * @param {number} bevelSize
     * @param {number} bevelSegments
     * @param {Array.<number>} color
     */
    _addBevelBar: (function () {
        var bevelStartSize = [];

        var xOffsets = [1, -1, -1, 1];
        var zOffsets = [1, 1, -1, -1];
        var yOffsets = [2, 0];

        return function (start, size, bevelSize, bevelSegments, uv) {

            bevelSize = Math.min(size[0], size[2]) / 2 * bevelSize;

            for (var i = 0; i < 3; i++) {
                bevelStartSize[i] = Math.max(size[i] - bevelSize * 2, 0);
            }
            var rx = (size[0] - bevelStartSize[0]) / 2;
            var ry = (size[1] - bevelStartSize[1]) / 2;
            var rz = (size[2] - bevelStartSize[2]) / 2;

            var pos = [];
            var normal = [];
            var vertexOffset = this._vertexOffset;

            var endIndices = [];
            for (var i = 0; i < 2; i++) {
            // for (var i = 0; i < 1; i++) {

                endIndices[i] = endIndices[i] = [];

                for (var m = 0; m <= bevelSegments; m++) {
                    for (var j = 0; j < 4; j++) {
                        if ((m === 0 && i === 0) || (i === 1 && m === bevelSegments)) {
                            endIndices[i].push(vertexOffset);
                        }
                        for (var n = 0; n <= bevelSegments; n++) {

                            var phi = n / bevelSegments * Math.PI / 2 + Math.PI / 2 * j;
                            var theta = m / bevelSegments * Math.PI / 2 + Math.PI / 2 * i;
                            // var r = rx < ry ? (rz < rx ? rz : rx) : (rz < ry ? rz : ry);
                            normal[0] = rx * Math.cos(phi) * Math.sin(theta);
                            normal[1] = ry * Math.cos(theta);
                            normal[2] = rz * Math.sin(phi) * Math.sin(theta);
                            pos[0] = normal[0] + xOffsets[j] * bevelStartSize[0] / 2;
                            pos[1] = (normal[1] + ry) + yOffsets[i] * bevelStartSize[1] / 2;
                            pos[2] = normal[2] + zOffsets[j] * bevelStartSize[2] / 2;

                            // Normal is not right if rx, ry, rz not equal.
                            if (!(Math.abs(rx - ry) < 1e-6 && Math.abs(ry - rz) < 1e-6)) {
                                normal[0] /= rx * rx;
                                normal[1] /= ry * ry;
                                normal[2] /= rz * rz;
                            }
                            vec3.normalize(normal, normal);

                            vec3.add(pos, pos, start);

                            this.attributes.position.set(vertexOffset, pos);
                            this.attributes.normal.set(vertexOffset, normal);
                            this.attributes.texcoord0.set(vertexOffset, uv);
                            vertexOffset++;
                        }
                    }
                }
            }

            var widthSegments = bevelSegments * 4 + 3;
            var heightSegments = bevelSegments * 2 + 1;

            var len = widthSegments + 1;

            for (var j = 0; j < heightSegments; j ++) {
                for (var i = 0; i <= widthSegments; i ++) {
                    var i2 = j * len + i + this._vertexOffset;
                    var i1 = (j * len + (i + 1) % len) + this._vertexOffset;
                    var i4 = (j + 1) * len + (i + 1) % len + this._vertexOffset;
                    var i3 = (j + 1) * len + i + this._vertexOffset;

                    this.setTriangleIndices(this._triangleOffset++, [i4, i2, i1]);
                    this.setTriangleIndices(this._triangleOffset++, [i4, i3, i2]);
                }
            }

            // Close top and bottom
            this.setTriangleIndices(this._triangleOffset++, [endIndices[0][0], endIndices[0][2], endIndices[0][1]]);
            this.setTriangleIndices(this._triangleOffset++, [endIndices[0][0], endIndices[0][3], endIndices[0][2]]);
            this.setTriangleIndices(this._triangleOffset++, [endIndices[1][0], endIndices[1][1], endIndices[1][2]]);
            this.setTriangleIndices(this._triangleOffset++, [endIndices[1][0], endIndices[1][2], endIndices[1][3]]);

            this._vertexOffset = vertexOffset;
        };
    })()
});

export default ColumnGeometry;