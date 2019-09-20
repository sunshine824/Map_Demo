import Map from './Map.Setting'
import * as Utils from './Map.Util'

const Target = {
    layer: null,
    prevFeature: null,
    airPopup: null,
    detectPopup: null,
    airPlaneImgs: Map.allImgs,
    prevMoveFeature: null,
    /**
     * 初始化目标图层
     */
    init(opts) {
        let layer = new ol.layer.Vector({
            id: "targetLayer",
            source: new ol.source.Vector()
        })
        Map.map.addLayer(layer)
        this.layer = layer
        this.initPopup()
        this.initDetectionPopup()
        this._initLayerEvent(opts)
    },

    //添加图层默认事件
    _initLayerEvent(opts) {
        const map = Map.map
        let initPrevFeature = () => {
            if (!this.prevMoveFeature) return
            const options = this.prevMoveFeature.target
            const status = this.prevMoveFeature.status
            const style = this.prevMoveFeature.getStyle() || new ol.style.Style()

            if (status != 'active') {
                style.setImage(
                    this._pointStyle({
                        type: options['type'] || 'other',   //目标类型
                        name: options['name'],   //目标名称
                        mold: 'default',
                        deg: options['deg']
                    })
                )
                style.setZIndex(50)
                this.prevMoveFeature.setStyle(style)
                this.prevMoveFeature = null
            }

        }
        map.on("click", (evt) => {
            if (map.hasFeatureAtPixel(evt.pixel)) {
                initPrevFeature()
                let feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                    if (feature.type == 'target') {
                        return feature
                    }
                })
                if (feature) {
                    const options = feature.target
                    const style = feature.getStyle() || new ol.style.Style()
                    style.setImage(
                        this._pointStyle({
                            type: options['type'] || 'other',   //目标类型
                            name: options['name'],   //目标名称
                            mold: 'active',
                            deg: options['deg']
                        })
                    );
                    opts.success && opts.success(feature)
                    style.setZIndex(100)
                    feature.setStyle(style)
                    this.showOverLay(options.id, 'airPopup')
                    this.prevMoveFeature = feature
                }
            } else {
                this.closeOverLay()
                initPrevFeature()
            }
        })
    },


    /**
     * 绘制目标元素
     * @param {*} options
     */
    drawPoint(options) {
        const targetFeature = this.layer.getSource().getFeatureById(options.id)
        if (targetFeature) { //之前有目标元素就直接更新坐标
            let point = [options.lon, options.lat]
            let geom = targetFeature.getGeometry()
            if (!geom) {
                geom = new ol.geom.Point(point);
            } else {
                geom.setCoordinates(point)
            }
            targetFeature.target = options
            targetFeature.set('lon', options.lon)
            targetFeature.set('lat', options.lat)
            targetFeature.setGeometry(geom)
        } else {  //之前没有此目标就添加
            const feature = new ol.Feature({
                ...options,
                geometry: new ol.geom.Point([options.lon, options.lat])
            })
            const style = new ol.style.Style()

            feature.type = options.targetType
            feature.status = 'default'
            feature.target = options
            feature.setId(options.id)

            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',   //目标类型
                    name: options['name'],   //目标名称
                    mold: 'default',  //目标选择样式
                    deg: options['deg']  //目标方向
                })
            )
            style.setZIndex(50)
            feature.setStyle(style)
            this.layer.getSource().addFeature(feature)
        }
    },

    //删除对应feature
    deleteFeature(id) {
        let source = this.layer.getSource()
        let feature = source.getFeatureById(id)
        if (feature) {
            source.removeFeature(feature)
        }
    },

    /**
     * 是否显示文字
     * @param {*} nameKey 文字显示字段
     * @param {*} isShow  是否显示文字
     */
    handleTargetText(isShow, nameKey = 'name') {
        if (!this.layer) this.init()
        const features = this.layer.getSource().getFeatures()
        features.map(item => {
            const options = item.target
            if (isShow) {
                const style = item.getStyle()
                style.setText(
                    this._pointStyle({
                        name: options[nameKey],
                        mold: 'text',
                        color: '#2d8cf0',
                        deg: options['deg']
                    })
                )
            } else {
                const status = item.status
                const style = new ol.style.Style()
                if (status == 'active') {
                    style.setImage(
                        this._pointStyle({
                            type: options['type'] || 'other',   //目标类型
                            name: options['name'],   //目标名称
                            mold: 'active',
                            deg: options['deg']
                        })
                    )
                    style.setZIndex(100)
                } else if (status == 'default') {
                    style.setImage(
                        this._pointStyle({
                            type: options['type'] || 'other',   //目标类型
                            name: options['name'],   //目标名称
                            mold: 'default',
                            deg: options['deg']
                        })
                    )
                    style.setZIndex(50)
                }
                item.setStyle(style)
            }
        })
    },

    /**
     * 选中feature(单选)
     * @param {*} id
     */
    activeRadioPoint(id) {
        const feature = this.layer.getSource().getFeatureById(id)
        if (!feature) return
        const options = feature.target
        const name = options['name']
        const status = feature.status
        const style = feature.getStyle() || new ol.style.Style()

        if (status == 'default') {
            const prevFeature = this.prevFeature
            //恢复前一个目标样式
            if (prevFeature) {
                this.initPrevfeature(prevFeature.target.id)
            }
            feature.status = 'active'
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'active',
                    deg: options['deg']
                })
            )
            style.setZIndex(100)
        } else {
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'default',
                    deg: options['deg']
                })
            )
            style.setZIndex(50)
            feature.status = 'default'
        }
        this.setCenter(id)
        feature.setStyle(style)

        this.prevFeature = feature
    },

    /**
     * 将之前目标恢复默认样式
     */
    initPrevfeature(id) {
        if (id) {
            const feature = this.layer.getSource().getFeatureById(id)
            if (!feature) return
            const options = feature.target
            const style = feature.getStyle() || new ol.style.Style()
            if (feature) {
                style.setImage(
                    this._pointStyle({
                        type: options['type'] || 'other',
                        mold: 'default',
                        deg: options['deg']
                    })
                )
                style.setZIndex(50)
                feature.status = 'default'
                feature.setStyle(style)
                this.prevFeature = null
            }
        }
    },

    /**
     * 气泡层
     * @param {*} target
     */
    initPopup(target = 'targetPopup') {
        let popup = new ol.Overlay({
            element: document.getElementById(target),
            auto: false,
            //autoPanMargin: 20,
            offset: [-20, -20],
            positioning: 'bottom-left'
        })
        this.airPopup = popup
        Map.map.addOverlay(popup)
    },

    /**
     * 心率/血压popup
     * @param {*} restore
     */
    initDetectionPopup(target = 'detection') {
        let popup = new ol.Overlay({
            element: document.getElementById(target),
            auto: false,
            //autoPanMargin: 20,
            offset: [-80, -30],
            positioning: 'bottom-left'
        })
        this.detectPopup = popup
        Map.map.addOverlay(popup)
    },

    /**
     * 关闭气泡
     */
    closeOverLay(restore = true, overlay = 'airPopup') {
        let feature = this.prevFeature
        if (!feature) return
        const options = feature.target
        const style = feature.getStyle() || new ol.style.Style()
        this[overlay].setPosition(undefined)
        //选中目标是否恢复初始状态
        if (restore) {
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'default',
                    //status: feature.get('status'),
                    deg: options['deg']
                })
            )
            style.setZIndex(50)
            feature.setStyle(style)
        }
    },

    /**
     * 显示气泡
     * @param {*} id 目标id
     * @param {*} overlay
     */
    showOverLay(id, overlay) {
        console.log(overlay)
        const feature = this.layer.getSource().getFeatureById(id)
        if (!feature) return
        const options = feature.target
        const point = [options['lon'] * 1, options['lat'] * 1]
        const style = feature.getStyle() || new ol.style.Style()
        this.prevFeature = feature
        this[overlay].setPosition(point)
        style.setImage(
            this._pointStyle({
                type: options['type'] || 'other',
                mold: 'active',
                deg: options['deg']
            })
        )
        style.setZIndex(100)
        feature.setStyle(style)
        //Map.map.getView().setCenter(point)
    },

    /**
     * 将目标设置成选中状态
     * @param {*} id
     */
    activeTargetById(id) {
        const feature = this.layer.getSource().getFeatureById(id)
        if (!feature) return
        const style = feature.getStyle() || new ol.style.Style()
        const options = feature.target
        if (feature) {
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'active',
                    deg: options['deg']
                })
            )
            style.setZIndex(100)
            feature.setStyle(style)
            feature.status = 'active'
        }
    },

    /**
     * 将目标设置成默认状态
     */
    defaultTargetById(id) {
        const feature = this.layer.getSource().getFeatureById(id)
        if (!feature) return
        const style = feature.getStyle() || new ol.style.Style()
        const options = feature.target
        if (feature) {
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'default',
                    deg: options['deg']
                })
            )
            style.setZIndex(50)
            feature.setImage(style)
            feature.status = 'default'
        }
    },

    /**
     * 显示目标feature
     * @param {*} id
     */
    showTargetById(id) {
        const feature = this.layer.getSource().getFeatureById(id)
        if (!feature) return
        const options = feature.target


        const point = [options['lon'] * 1, options['lat'] * 1]
        const prevFeature = this.prevFeature

        if (prevFeature) {
            const status = prevFeature.status
            const style = prevFeature.getStyle() || new ol.style.Style()
            if (status == 'active') {
                style.setImage(
                    this._pointStyle({
                        type: options['type'] || 'other',
                        mold: 'default',
                        deg: options['deg']
                    })
                )
                style.setZIndex(50)
                prevFeature.setStyle(style)
                prevFeature.status = 'default'
            }
        } else {
            const style = feature.getStyle() || new ol.style.Style()
            style.setImage(
                this._pointStyle({
                    type: options['type'] || 'other',
                    mold: 'active',
                    deg: options['deg']
                })
            )
            style.setZIndex(100)
            feature.setStyle(style)
            feature.status = 'active'
            this.prevFeature = feature
        }

        Map.map.getView().setCenter(point)
    },

    /**
     * 目标样式
     * @param {*} options
     */
    _pointStyle(options) {
        switch (options.mold) {
            case 'default':
                return new ol.style.Icon({
                    crossOrigin: "anonymous",
                    offsetOrigin: 'bottom-center',
                    anchor: [.5, .5],
                    imgSize: [48, 38],
                    scale: .9,
                    src: this.airPlaneImgs[options['type']],
                    rotation: options.deg && options.deg * (Math.PI / 180)
                })
                break;
            case 'text':
                return new ol.style.Text({
                    font: '15px Microsoft YaHei',
                    text: options.name,
                    offsetX: 20,
                    offsetY: 10,
                    textAlign: 'left',
                    fill: new ol.style.Fill({
                        color: options.color || '#2d8cf0'
                    })
                })
                break;
            case 'active':
                return new ol.style.Icon({
                    crossOrigin: "anonymous",
                    offsetOrigin: 'bottom-center',
                    anchor: [.5, .5],
                    imgSize: [48, 38],
                    scale: 1,
                    src: this.airPlaneImgs[options.type + '_Active'],
                    rotation: options.deg && options.deg * (Math.PI / 180),
                })
                break;
            case 'big':
                return new ol.style.Icon({
                    crossOrigin: "anonymous",
                    anchor: [.55, 1.1],
                    imgSize: [48, 38],
                    scale: 1,
                    src: this.airPlaneImgs[options['type']],
                    rotation: options.deg && options.deg * (Math.PI / 180)
                })
                break;
        }
    },

    /**
     * 获取所有feature
     * @param {*} options
     */
    getAllFeature() {
        return this.layer.getSource().getFeatures()
    },

    /**
     * 清除所有feature
     * @param {*} options
     */
    clearAllFeature() {
        this.layer.getSource().clear()
    },

    //根据Id 获取坐标
    getFeaturesById(id) {
        const feature = this.layer.getSource().getFeatureById(id)
        return feature
    },
    //移动中心到target
    setCenter(id) {
        let view = Map.map.getView()
        const feature = this.layer.getSource().getFeatureById(id)
        const target = feature.target
        let point = [target['lon'] * 1, target['lat'] * 1]
        view.animate({
            center: point,
            duration: 600
        })
    }

}

Map.Target = Target

export default Target
