import { application, plugin } from 'claygl';
import ClayAdvancedRenderer from 'claygl-advanced-renderer';

import ColumnGeometry from './ColumnGeometry';
import voxelize from './voxelize';

var config = {
    scale: 0.3,
    roughness: 0,
    metalness: 1,
    fstop: 1.4,
    lockY: false,
    move: true,
    sameColor: false,
    backgroundColor: '#000',
    color: '#777',
    colorContrast: 1.2,
    lightIntensity: 1,
    lightColor: '#fff',
    lightRotate: 30,
    lightPitch: 40,
    AO: 1.5,
    showEnvironment: false,

    barNumber: 80,

    barBevel: 0.1,
    barSize: 1.3
};


var app = application.create('#main', {

    autoRender: false,

    devicePixelRatio: 1,

    // event: true,

    init: function (app) {

        app.renderer.clearColor = [0, 0, 0, 1];

        this._camera = app.createCamera([-50, 50, 50], [0, 0, 0]);

        var renderer = this._renderer = new ClayAdvancedRenderer(app.renderer, app.scene, app.timeline, {
            shadow: {
                enable: true
            },
            temporalSuperSampling: {
                dynamic: false
            },
            postEffect: {
                bloom: {
                    enable: true
                },
                screenSpaceAmbientOcclusion: {
                    enable: true,
                    temporalFilter: false,
                    radius: 2,
                    intensity: 1.1
                },
                screenSpaceReflection: {
                    enable: true
                },
                depthOfField: {
                    blurRadius: 20,
                    focalDistance: 50,
                    enable: false,
                    aperture: config.fstop
                }
            }
        });
        renderer.render();

        this._control = new plugin.OrbitControl({
            target: this._camera,
            domElement: app.container,
            timeline: app.timeline
        });
        this._control.on('update', function () {
            this._renderer.render();
        }, this);

        this._columnMesh = app.createMesh(new ColumnGeometry(), {
            metalness: config.metalness,
            roughness: config.roughness
        });
        this._columnMesh.culling = false;

        var defaultImg = new Image();
        var self = this;
        defaultImg.onload = function () {
            self._updateColumnGeo(defaultImg);
            self._img = defaultImg;
        };
        defaultImg.src = 'assets/bitcoin.png';

        var light = app.createDirectionalLight([-1, -1, -1], '#fff', 2);
        light.shadowResolution = 2048;
        return app.createAmbientCubemapLight('./assets/env/pisa.hdr', 1, 0.5, 3).then(function () {
            renderer.render();
        });
    },

    loop: function () {},

    _updateColumnGeo: function (img) {
        voxelize(this._columnMesh, img, config);
        this._renderer.render();
    },

    methods: {

        setImage: function (app, img) {
            this._img = img;
            app.methods.updateColumns();
        },

        updateColumns: function () {
            if (this._img) {
                this._updateColumnGeo(this._img);
            }
            app.methods.updateMaterial();
        },

        updateMaterial: function () {
            this._columnMesh.material.set({
                metalness: config.metalness,
                roughness: config.roughness,
                color: config.sameColor ? config.color : '#fff'
            });
            this._columnMesh.material[config.sameColor ? 'disableTexture' : 'enableTexture']('diffuseMap');

            this._renderer.render();
        },

        updatePostEffect: function () {
            this._renderer.setPostEffect({
                depthOfField: {
                    aperture: config.fstop
                }
            });
            this._renderer.render();
        },

        setViewControl: function () {

        }
    }
});

var loadingEl = document.getElementById('loading');
loadingEl.parentNode.removeChild(loadingEl);


var gui = new dat.GUI();

gui.add(config, 'scale', 0, 1).onFinishChange(app.methods.updateColumns);
gui.add(config, 'colorContrast', 0, 2).onFinishChange(app.methods.updateColumns);

gui.add(config, 'sameColor').onChange(app.methods.updateMaterial);
gui.addColor(config, 'color').onChange(app.methods.updateMaterial);

['roughness', 'metalness'].forEach(function(propName) {
    gui.add(config, propName, 0, 1).step(0.01).onFinishChange(app.methods.updateMaterial);
});


gui.add(config, 'barNumber', 0, 256).onFinishChange(app.methods.updateColumns);
gui.add(config, 'barSize', 0, 2).onFinishChange(app.methods.updateColumns);
gui.add(config, 'barBevel', 0, 1).onFinishChange(app.methods.updateColumns);

// gui.add(config, 'fstop', 0., 10).onFinishChange(app.methods.updatePostEffect);


function readFile(file) {
    if (!file || !file.type.match(/image/)) {
        return;
    }

    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            app.methods.setImage(img);
        };
        img.src = e.target.result;
    };
    fileReader.readAsDataURL(file);
}

var imgUploadEl = document.getElementById('image-upload');
imgUploadEl.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
});
imgUploadEl.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;
    return readFile(files[0]);
});
imgUploadEl.addEventListener('click', function() {
    var $file = document.createElement('input');
    $file.type = 'file';
    $file.addEventListener('change', function(e) {
        readFile(e.target.files[0]);
    });
    $file.click();
});
