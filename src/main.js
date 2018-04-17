import { application, plugin, core } from 'claygl';
import ClayAdvancedRenderer from 'claygl-advanced-renderer';

import ColumnGeometry from './ColumnGeometry';
import voxelize from './voxelize';

var config = {
    scale: 0.3,
    metal: true,
    roughness: 0.15,
    fstop: 1.4,

    sameColor: false,
    backgroundColor: '#000',
    color: '#777',
    colorContrast: 1.2,

    lightIntensity: 1,

    ambientIntensity: 1,

    showEnvironment: false,

    barNumber: 80,

    barBevel: 0.15,
    barSize: 1.3,

    zoomSensitivity: 1,

    skybox: true
};

function parseColor(str) {
    var arr = core.color.parse(str) || [0, 0, 0, 1];
    arr[0] /= 255;
    arr[1] /= 255;
    arr[2] /= 255;
    return arr;
}

var app = application.create('#main', {

    autoRender: false,

    devicePixelRatio: 1,

    // event: true,

    init: function (app) {

        app.renderer.clearColor = [0, 0, 0, 1];

        this._camera = app.createCamera([-30, 40, 30], [0, 0, 0]);

        var renderer = this._renderer = new ClayAdvancedRenderer(app.renderer, app.scene, app.timeline, {
            shadow: {
                enable: true,
                blurSize: 5
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
            metalness: +config.metal,
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
        light.shadowCascade = 2;
        light.shadowBias = 0.01;

        this._dirLight = light;

        return app.createAmbientCubemapLight('./assets/env/pisa.hdr', 1, 0.5, 3).then(function (result) {
            var skybox = new plugin.Skybox({
                scene: app.scene
            });
            skybox.setEnvironmentMap(result.specular);
            skybox.material.set('lod', 4);
            skybox.material.define('fragment', 'RGBM_DECODE');
            self._skybox = skybox;

            self._ambientLight = result;
            renderer.render();
        });
    },

    loop: function () {},

    _updateColumnGeo: function (img) {
        voxelize(this._columnMesh, img, config);
        this._renderer.render();
    },

    methods: {

        updateLight: function (app) {
            this._ambientLight.diffuse.intensity = config.ambientIntensity / 2;
            this._ambientLight.specular.intensity = config.ambientIntensity;
            this._dirLight.intensity = config.lightIntensity;
            this._skybox[config.skybox ? 'attachScene' : 'detachScene'](app.scene);
            this._renderer.render();

            app.renderer.clearColor = parseColor(config.backgroundColor);
        },

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
                metalness: +config.metal,
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

        updateViewControl: function () {
            this._control.zoomSensitivity = config.zoomSensitivity;
        },

        render: function () {
            this._renderer.render();
        }
    }
});

var loadingEl = document.getElementById('loading');
loadingEl.parentNode.removeChild(loadingEl);


var gui = new dat.GUI();

var genFolder = gui.addFolder('Generate');
genFolder.open();

genFolder.add(config, 'scale', 0, 1).onFinishChange(app.methods.updateColumns);
// genFolder.add(config, 'colorContrast', 0, 2).onFinishChange(app.methods.updateColumns);

genFolder.add(config, 'barNumber', 0, 256).onFinishChange(app.methods.updateColumns);
genFolder.add(config, 'barSize', 0, 2).onFinishChange(app.methods.updateColumns);
genFolder.add(config, 'barBevel', 0, 1).onFinishChange(app.methods.updateColumns);

var matFolder = gui.addFolder('Material');
matFolder.open();
matFolder.add(config, 'metal').onChange(app.methods.updateMaterial);
matFolder.add(config, 'roughness', 0, 1).step(0.01).onChange(app.methods.updateMaterial);
matFolder.add(config, 'sameColor').onChange(app.methods.updateMaterial);
matFolder.addColor(config, 'color').onChange(app.methods.updateMaterial);


var lightFolder = gui.addFolder('Light');
lightFolder.open();
lightFolder.add(config, 'skybox').onChange(app.methods.updateLight);
lightFolder.addColor(config, 'backgroundColor').onChange(app.methods.updateLight);
lightFolder.add(config, 'lightIntensity', 0, 2).onChange(app.methods.updateLight);
lightFolder.add(config, 'ambientIntensity', 0, 2).onChange(app.methods.updateLight);
// gui.add(config, 'fstop', 0., 10).onFinishChange(app.methods.updatePostEffect);

var controlFolder = gui.addFolder('Control');
controlFolder.open();
controlFolder.add(config, 'zoomSensitivity', 0, 2).onChange(app.methods.updateViewControl);


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


window.addEventListener('resize', function () {
    app.resize();
    app.methods.render();
});