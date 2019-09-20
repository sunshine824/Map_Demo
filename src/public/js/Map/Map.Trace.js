import Map from './Map.Setting'
import Target from './Map.Target'
import * as Utils from './Map.Util'
import { getRandom } from "../Helper";

const STEP = 10
const STEP_TIME = 5000

let signElem = null, signPopup = null, wayPopup = null

const Trace = {
    layer: null,
    airPlaneImgs: Map.allImgs,
    prvFeature: {},
    Timer: {},  //实时定时器
    prevMoveFeature: null,
    /**
     * 初始化轨迹图层
     */
    init(opts) {
        let layer = new ol.layer.Vector({
            id: "lineLayer",
            source: new ol.source.Vector()
        })
        Map.map.addLayer(layer)
        this._initWayPopup()
        this._initLayerEvent(opts)
        this.layer = layer
    },

    //添加图层默认事件
    _initLayerEvent(opts) {
        const map = Map.map
        let timer = null
        let initPrevFeature = () => {
            if (!this.prevMoveFeature) return
            const status = this.prevMoveFeature.status

            if (status == 'active') {
                this.prevMoveFeature.setStyle(
                    this._traceStyle({
                        mold: 'point'
                    })
                )
                this.prevMoveFeature.status = 'default'
            }
        }
        map.on('pointermove', (evt) => {
            if (map.hasFeatureAtPixel(evt.pixel)) {
                clearTimeout(timer)
                initPrevFeature()
                timer = setTimeout(()=>{
                    let feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                        if (feature.type == 'roadPoint') {
                            return feature
                        }
                    })
                    if (feature) {
                        feature.setStyle(
                            this._traceStyle({
                                mold: 'point',
                                fillColor: opts.fillColor,
                                strokeColor: opts.strokeColor,
                                pointRadius: opts.pointRadius
                            })
                        );
                        feature.status = 'active'
                        this.prevMoveFeature = feature
                        opts.hoverBack && opts.hoverBack(feature)
                    }
                },400)
            } else {
                initPrevFeature()
            }
        })
    },

    /**
     * 绘制轨迹线
     * @param {*} opt   trace:坐标点  color:线段颜色  dashed:虚线（是:true, 否:false）
     */
    drawLine(opt) {
        const { trace } = opt
        let flag = trace instanceof Array //判断是否是数组

        if (flag) { //一次性绘制出轨迹
            this._drawAllTraceLine(opt)
        } else { //轨迹播放逐一渲染
            this._drawOneByOneTrace(opt)
        }
    },

    /**
     * 保存上一个feature
     * @param {*} feature
     */
    savePrvfeature(feature) {
        let name = feature.get('name')
        this.prvFeature[name] = feature
    },

    /**
     * 一次性绘制出轨迹
     * @param {*} trace
     * @param isShowPoint 是否显示途径点
     */
    _drawAllTraceLine(opt) {
        const { trace, color, dashed, hasTarget = false, isShowPoint = true, id } = opt

        let points = [], lineFeature, pointFeature, targetFeature
        trace.map(item => {
            if (points.length > 1) { points.shift() }
            points.push(Utils.tranEPSG3857([item.lon * 1, item.lat * 1]))
            //画线
            lineFeature = this.drawRoute({ ...opt, points, trace: item })
            //画轨迹途径点
            if (isShowPoint) {
                pointFeature = this.drawPoint({ ...opt, point: points[points.length - 1], trace: item })
                this.layer.getSource().addFeature(pointFeature)
            }
            //添加到图层
            this.layer.getSource().addFeature(lineFeature)
        })
        //画目标点
        if (hasTarget) {
            targetFeature = this.drawTarget({ ...opt, trace: trace[0] })
            this.layer.getSource().addFeature(targetFeature)
        }
    },

    /**
     * 历史轨迹播放逐一渲染
     * @param isShowPoint 是否显示途径点
     */
    _drawOneByOneTrace(opt) {
        const { trace, color, dashed, isShowPoint = false, id } = opt
        const prvFeature = this.prvFeature[trace.name]
        let pointFeature, lineFeature, targetFeature, points = []
        if (prvFeature) { //将上一个目标元素作为起点
            points.push(
                Utils.tranEPSG3857([prvFeature.get('lon') * 1, prvFeature.get('lat') * 1])
            )
            let source = this.layer.getSource()
            source.removeFeature(prvFeature)
        }
        //画目标元素
        targetFeature = this.drawTarget({ ...opt, trace })

        points.push(
            Utils.tranEPSG3857([trace.lon * 1, trace.lat * 1])
        )
        //画线
        lineFeature = this.drawRoute({ ...opt, points, trace })
        //画途径点
        if (isShowPoint) {
            pointFeature = this.drawPoint({ ...opt, point: points[points.length - 1], trace })
            this.layer.getSource().addFeature(pointFeature)
        }
        //添加到图层
        this.layer.getSource().addFeatures([targetFeature, lineFeature])

        this.prvFeature[trace.name] = targetFeature
    },

    /**
     * 实时绘制轨迹
     * @param isShowLine 是否显示轨迹
     * @param isShowPoint 是否显示途径点
     * @param {*} opt
     */
    realDrawLine(opt) {
        const { trace, color, dashed, step, isShowLine = true, isShowPoint = true, id } = opt
        const Step = step || STEP
        let prevFeature = this.prvFeature[trace.name]

        if (prevFeature) {
            let pointFeature, lineFeature, points = [], prevPoint = [], nowPoint = []
            prevPoint = [prevFeature.get('lon') * 1, prevFeature.get('lat') * 1]
            nowPoint = [trace.lon * 1, trace.lat * 1]

            if (isShowLine) {
                points.push(Utils.tranEPSG3857(prevPoint), Utils.tranEPSG3857(nowPoint))
                //更新轨迹位置
                lineFeature = this.drawRoute({ ...opt, points, trace })
            }
            //两点确定线段方程
            if (nowPoint[1] == prevPoint[1] && nowPoint[0] == prevPoint[0]) {  //如果上一个点等于下一个点
                return
            }

            let k, b, part, count = 1;

            let timer = setInterval(() => {
                let x, y
                if (nowPoint[1] == prevPoint[1] && nowPoint[0] != prevPoint[0]) {  //不相同时垂直于y轴 例如：y = 5
                    y = nowPoint[1]
                    x = prevPoint[0] + part * count
                } else if (nowPoint[0] == prevPoint[0] && nowPoint[1] != prevPoint[1]) {  //不相同时垂直于x轴  例如：x = 5
                    part = (nowPoint[1] - prevPoint[1]) / Step
                    x = nowPoint[0]
                    y = prevPoint[1] + part * count
                } else { // y = kx + b
                    k = (nowPoint[1] - prevPoint[1]) / (nowPoint[0] - prevPoint[0])
                    b = nowPoint[1] - k * nowPoint[0]
                    part = (nowPoint[0] - prevPoint[0]) / Step
                    x = prevPoint[0] + part * count
                    y = k * x + b * 1
                }
                prevFeature.set('lon', x)
                prevFeature.set('lat', y)
                //更新目标位置
                let targetGeom = prevFeature.getGeometry()

                if (!targetGeom) {
                    targetGeom = new ol.geom.Point(
                        Utils.tranEPSG3857([x, y])
                    );
                } else {
                    targetGeom.setCoordinates(
                        Utils.tranEPSG3857([x, y])
                    )
                }
                prevFeature.setGeometry(targetGeom)

                this.prvFeature[trace.name] = prevFeature

                count++
                if (count >= Step) {
                    clearInterval(timer)
                    //添加到图层
                    if (isShowLine) {
                        this.layer.getSource().addFeatures([lineFeature])
                    }
                    //画途径点
                    if (isShowPoint) {
                        pointFeature = this.drawPoint({ ...opt, point: points[1], trace })
                        this.layer.getSource().addFeatures([pointFeature])
                    }
                }

            }, STEP_TIME / Step)

            this.Timer[trace.name] = timer
        }
    },

    /**
     * 意图分析
     * @param {*} opt
     */
    intentionAnalysis(opt) {
        const { trace, color, dashed, id } = opt

        let points = [], lineFeature, pointFeature, targetFeature
        trace.map((item, index) => {
            let point = Utils.tranEPSG3857([item.lon * 1, item.lat * 1])
            points.push(point)
            pointFeature = this.drawPoint({ ...opt, point, trace: item })
            this.layer.getSource().addFeature(pointFeature)
        })
        //画线
        lineFeature = this.drawRoute({ ...opt, points, trace: trace[0] })
        //画目标点
        targetFeature = this.drawTarget({ ...opt, trace: trace[trace.length - 1] })
        this.layer.getSource().addFeatures([lineFeature, targetFeature])
    },

    /**
     * 规律分析路线
     * @param {*} opt
     * @param type 区分经典路线
     */
    regularAnalysis(opt) {
        const { trace, color, dashed, type, id } = opt
        let points = [], lineFeature, pointFeature, targetFeature
        trace.map((item, index) => {
            let point = Utils.tranEPSG3857([item.lon * 1, item.lat * 1])
            points.push(point)
            //画首尾轨迹途径点
            if (index == 0) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            } else if (index == trace.length - 1) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            }
            this.layer.getSource().addFeature(pointFeature)
        })
        if (type == 'classic') {
            this._initSignPopup()
            signElem.innerHTML = `<div class="sign classic">经典路线</div>`
            signPopup.setPosition(points.length > 2 ? points[points.length - 2] : points[0]);
            signPopup.setOffset([34, -14])
            signElem = null;
            signPopup = null;
            this._initSignPopup()
        }
        //画线
        lineFeature = this.drawRoute({ ...opt, points, trace: trace[0] })
        //画目标点
        targetFeature = this.drawTarget({ ...opt, trace: trace[0] })
        this.layer.getSource().addFeatures([lineFeature, targetFeature])
    },

    /**
     * 行为分析
     * @param {*} opt
     * @param type 判断异常航线
     */
    behaviorAnalysis(opt) {
        const { trace, color, dashed, type, id } = opt
        let points = [], lineFeature, pointFeature, targetFeature
        trace.map((item, index) => {
            let point = Utils.tranEPSG3857([item.lon * 1, item.lat * 1])
            points.push(point)
            //画首尾轨迹途径点
            if (index == 0) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            } else if (index == trace.length - 1) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            }
            this.layer.getSource().addFeature(pointFeature)
        })
        if (type == 'error') {
            this._initSignPopup()
            signElem.innerHTML = `<div class="sign error">异常航线</div>`
            signPopup.setPosition(points.length > 2 ? points[points.length - 2] : points[0]);
            signPopup.setOffset([34, -14])
            signElem = null;
            signPopup = null;
            this._initSignPopup()
        }
        //画线
        lineFeature = this.drawRoute({ ...opt, points, trace: trace[0] })
        //画目标点
        targetFeature = this.drawTarget({ ...opt, trace: trace[0] })
        this.layer.getSource().addFeatures([lineFeature, targetFeature])
    },

    /**
     * 航迹预测
     * @param {*} opt
     */
    trackPrediction(opt) {
        const { trace, color, dashed, id } = opt
        let points = [], lineFeature, pointFeature, targetFeature
        this._initSignPopup()

        trace.map((item, index) => {
            let point = Utils.tranEPSG3857([item.lon * 1, item.lat * 1])
            points.push(point)
            //画首尾轨迹途径点
            if (index == 0) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            } else if (index == trace.length - 1) {
                pointFeature = this.drawPoint({ ...opt, point, trace: item })
            } else {
                pointFeature = this.drawPoint({ ...opt, point, trace: item, type: 'way' })
            }
            this.layer.getSource().addFeature(pointFeature)
        })
        signElem.innerHTML = `<div class="sign error">23.5%</div>`
        signPopup.setPosition(points[points.length - 2]);
        signPopup.setOffset([34, -14])
        signElem = null;
        signPopup = null;
        this._initSignPopup()
        //画线
        //lineFeature = this.drawRoute(id, points, color, dashed, trace[0])
        lineFeature = this.drawRoute({
            ...opt,
            points,
            trace: trace[0]
        })
        //画目标点
        targetFeature = this.drawTarget({ ...opt, trace: trace[0] })
        this.layer.getSource().addFeatures([lineFeature, targetFeature])
    },

    //画线
    drawRoute(opts) {
        const { id, points, trace } = opts
        let lineFeature;
        lineFeature = new ol.Feature({
            ...trace,
            geometry: new ol.geom.LineString(points)
        })
        const random = getRandom(1, 10000)
        const dateTime = new Date().getTime()
        lineFeature.setId(id + 'r=' + random + 't=' + dateTime)
        lineFeature.setStyle(this._traceStyle({ ...opts, mold: 'line' }))
        return lineFeature;
    },

    //画途径点
    drawPoint(opts) {
        const { id, point, trace, type } = opts
        let pointFeature;
        pointFeature = new ol.Feature({
            ...trace,
            geometry: new ol.geom.Point(point)
        })

        const random = getRandom(1, 10000)
        const dateTime = new Date().getTime()
        pointFeature.target = trace
        pointFeature.status = 'default'
        pointFeature.setId(id + 'r=' + random + 't=' + dateTime)
        if (type == 'way') {
            pointFeature.type = 'wayPoint'
            pointFeature.setStyle(this._traceStyle({ ...opts, mold: 'wayPoint' }))
        } else {
            pointFeature.type = 'roadPoint'
            pointFeature.setStyle(this._traceStyle({ ...opts, mold: 'point' }))
        }
        return pointFeature;
    },

    //画目标元素
    drawTarget(opts) {
        const { id, trace } = opts
        let targetFeature;
        targetFeature = new ol.Feature({
            ...trace,
            geometry: new ol.geom.Point(
                Utils.tranEPSG3857([trace.lon * 1, trace.lat * 1])
            )
        })
        targetFeature.type = 'target'
        const random = getRandom(1, 10000)
        const dateTime = new Date().getTime()
        targetFeature.setId(id + 'r=' + random + 't=' + dateTime)

        targetFeature.setStyle(this._traceStyle({ mold: 'target', ...opts }))
        return targetFeature;
    },

    //清除轨迹
    clearAll() {
        if (this.layer) {
            this.prvFeature = {}
            this.layer.getSource().clear()
        }
    },

    //清除指定飞机轨迹
    clearTraceById(id) {
        if (this.layer) {
            const features = this.layer.getSource().getFeatures()
            const feature = Target.layer.getSource().getFeatureById(id)
            const target = feature.target
            if (Target.layer) {
                this.prvFeature[target.name] = null
            }
            //清除实时定时器
            if (this.Timer[target.name]) {
                clearInterval(this.Timer[target.name])
                delete this.Timer[target.name]
            }
            features.map(feature => {
                const featureId = (feature.getId()).split('r=')[0]
                const targetId = feature.values_.id
                if (featureId == id || targetId == id) {
                    this.layer.getSource().removeFeature(feature)
                    let signs = document.querySelectorAll('.sign')
                    if (signs.length) {
                        for (let i = 0; i < signs.length; i++) {
                            Utils.remove(signs[i].parentNode.parentNode)
                        }
                    }
                }

            })
        }
    },

    //清除指定线段
    clearLineById(id) {
        const features = this.layer.getSource().getFeatures()
        features.map(feature => {
            const featureId = (feature.getId()).split('r=')[0]
            if (featureId == id) {
                this.layer.getSource().removeFeature(feature)
                let signs = document.querySelectorAll('.sign')
                if (signs.length) {
                    for (let i = 0; i < signs.length; i++) {
                        Utils.remove(signs[i].parentNode.parentNode)
                    }
                }
            }
        })
    },

    //点击途径点显示popup
    showWayPopup(feature) {
        const target = feature.target
        let lat = target.lat * 1
        let lon = target.lon * 1
        if (wayPopup) {
            wayPopup.setPosition(Utils.tranEPSG3857([lon, lat]))
        }
    },
    //关闭途径点popup
    closeWayPopup() {
        if (wayPopup) {
            wayPopup.setPosition(undefined)
        }
    },

    //是否显示对应layer
    toggleLayer(layer) {
        if (!layer) return
        if (layer.getVisible()) {
            layer.setVisible(false)
        } else {
            layer.setVisible(true)
        }
    },

    /**
     * 标识气泡层
     * @param {*} target
     */
    _initSignPopup() {
        if (signElem) {
            signElem.parentNode.removeChild(signElem);
        }
        signElem = document.createElement("div");
        signPopup = new ol.Overlay({
            element: signElem,
            offset: [0, -15],
            positioning: "bottom-center"
        })
        Map.map.addOverlay(signPopup)
    },

    /**
     * 初始化途经点popup
     */
    _initWayPopup(target = "targetList") {
        wayPopup = new ol.Overlay({
            element: document.getElementById(target),
            auto: true,
            offset: [0, -10],
            positioning: 'bottom-center'
        })
        Map.map.addOverlay(wayPopup)
    },

    /**
     * 图层样式
     * @param {*} opt
     */
    _traceStyle(opt) {
        const { mold, deg, color = "#46c3b7", type, dashed, fillColor = "#fff", strokeColor = "#46c3b7", pointRadius = 2.5 } = opt
        switch (mold) {
            case 'target':
                return new ol.style.Style({
                    image: new ol.style.Icon({
                        crossOrigin: "anonymous",
                        anchorOrigin: "",
                        src: this.airPlaneImgs[type || 'airliner'],
                        anchor: [.6, .9],
                        rotation: deg * (Math.PI / 180)
                    }),
                    zIndex: 10
                })
                break;
            case 'line':
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: color,
                        width: 1,
                        lineDash: [dashed ? dashed : 0]
                    }),
                    zIndex: 2
                });
                break;
            case 'wayPoint':
                return new ol.style.Style({
                    image: new ol.style.Icon({
                        crossOrigin: "anonymous",
                        anchorOrigin: "",
                        src: this.airPlaneImgs[type || 'airliner'],
                        anchor: [.6, .9],
                        scale: .6,
                        rotation: deg * (Math.PI / 180)
                    }),
                    zIndex: 5
                })
                break
            case 'point':
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: new ol.style.Fill({ color: fillColor }),
                        stroke: new ol.style.Stroke({ color: strokeColor, width: 1 }),
                        radius: pointRadius,
                    }),
                    zIndex: 5
                })
                break
        }
    }
}

Map.Trace = Trace

export default Trace