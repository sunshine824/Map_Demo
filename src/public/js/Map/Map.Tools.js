import { getRandom } from "../Helper";
import Map from './Map.Setting'
import * as Utils from './Map.Util'

let sketch = null, disPopup = null, disElem = null, measureDraw = null
let shapePopup = null, shapeElem = null, shapeDraw = null, operPopup = null

const Tools = {
  layer: null,
  allImgs: Map.allImgs,
  isRight: false,  //是否点击了鼠标右键（右键也能描点于右键去除绘制冲突）
  /**
   * 初始化目标图层
   */
  init(opt) {
    let layer = new ol.layer.Vector({
      id: "toolLayer",
      source: new ol.source.Vector()
    })
    Map.map.addLayer(layer)
    this.layer = layer
    this._initToolEvent(opt)
  },

  //初始化工具事件
  _initToolEvent(opt) {
    this._initOperPopup()
    //右键显示popup
    Map.map.getViewport().oncontextmenu = (event) => {
      event.preventDefault();
      // let pixel = Map.map.getEventPixel(event)
      // let hit = Map.map.hasFeatureAtPixel(pixel)
      // if (hit) {
      //   let feature = Map.map.forEachFeatureAtPixel(pixel, (feature) => {
      //     if (feature.type == 'region') {
      //       return feature
      //     }
      //   })
      //   if (feature) {
      //     let coord = Map.map.getEventCoordinate(event)
      //     operPopup.setPosition(coord)
      //     opt.success && opt.success(feature, feature.getGeometry())
      //   }
      // }
    }
    //左键取消popup
    Map.map.getViewport().onclick = (event) => {
      event.preventDefault();
      operPopup.setPosition(undefined)
    }
  },

  //关闭操作列表
  closeOperPopup() {
    operPopup.setPosition(undefined)
  },

  //归心
  backCenter() {
    const point = Map.defaultCenter
    Map.map.getView().setCenter(point)
  },

  //测量（测距、测面）
  measureDistance(opt = {}) {
    this.clearMeasureDraw()
    this.clearShapeDraw()
    const { type } = opt
    const that = this

    measureDraw = new ol.interaction.Draw({
      source: that.layer.getSource(),
      type: type || 'LineString',
      style: that._toolStyle({ type: 'line' })
    })
    this._initDisPopup()

    let listener;
    let count = 0;
    let output;
    measureDraw.on('drawstart', (evt) => {
      sketch = evt.feature;
      sketch.setId('draw' + (new Date()).getTime())

      /** @type {ol.Coordinate|undefined} */
      var tooltipCoord = evt.coordinate;
      let unix = '总长：'

      listener = sketch.getGeometry().on("change", function (evt) {
        var geom = evt.target;
        if (geom instanceof ol.geom.Polygon) {
          unix = "总面积："
          output = Utils.getArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.LineString) {
          unix = '总长：'
          output = Utils.getLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        }

        disElem.innerHTML = `<div class="popups ${sketch.getId()}">${unix}${output}<i typeId="${sketch.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i></div>`;
        disPopup.setPosition(tooltipCoord);
      });

      Map.map.on('singleclick', (evt) => {
        //设置测量提示信息的位置坐标，用来确定鼠标点击后测量提示框的位置
        disPopup.setPosition(evt.coordinate);
        //如果是第一次点击，则设置测量提示框的文本内容为起点
        if (count == 0) {
          disElem.innerHTML = `<span class="popups ${sketch.getId()}">起点</span>`;
        } else {
          disElem.innerHTML = `<span class="popups ${sketch.getId()}">${output}</span>`;
        }

        //更改测量提示框的样式，使测量提示框可见
        disElem.className = 'tooltip tooltip-measure';
        //创建测量提示框
        this._initDisPopup()
        //点击次数增加
        count++;
      })
    })

    measureDraw.on('drawend', (evt) => {
      this.clearShapeDraw()
      this.clearMeasureDraw()
      sketch.setStyle(that._toolStyle({ type: 'line' }))

      count = 0;
      //设置测量提示框的样式
      disElem.className = 'tooltip tooltip-measure';
      //设置偏移量
      disPopup.setOffset([0, -7]);
      //清空绘制要素
      sketch = null;
      //清空测量提示要素
      disElem = null;
      //创建测量提示框
      this._initDisPopup()
      //移除事件监听
      ol.Observable.unByKey(listener);
      //移除地图单击事件
      Map.map.removeEventListener('singleclick');

      //删除feature
      setTimeout(() => {
        let deleteElem = document.querySelectorAll('.tooltip-measure .delete')
        let layer = that.layer
        let source = layer.getSource()
        const features = source.getFeatures()
        for (let i = 0; i < deleteElem.length; i++) {
          deleteElem[i].onclick = function (e) {
            let id = this.getAttribute('typeid')
            let feature = source.getFeatureById(id)
            source.removeFeature(feature);

            let overlays = document.querySelectorAll(`.popups.${id}`)
            for (let i = 0; i < overlays.length; i++) {
              Utils.remove(overlays[i].parentNode)
            }
          }
        }
      })

    })

    Map.map.addInteraction(measureDraw)
  },

  /**
 * 绘制各种形状适量图
 * Point:点  LineString:线  Polygon:多边形 Circle:圆  Rectangle:矩形
 */
  drawShape(opt = {}) {
    this.isRight = false
    this.clearShapeDraw()
    this.clearMeasureDraw()
    let { type } = opt
    const that = this
    const typeCopy = type
    if (type !== 'None') {
      let geometryFunction, maxPoints, coordinate, radius;
      if (type == 'Rectangle') {    //绘制矩形
        type = 'LineString';           //设置绘制类型为LineString
        maxPoints = 2;                      //设置最大点数为2
        //设置几何信息变更函数，即设置长方形的坐标点
        geometryFunction = function (coordinates, geometry) {
          if (!geometry) {
            geometry = new ol.geom.Polygon([]);       //多边形
          }
          var start = coordinates[0];
          var end = coordinates[1];
          geometry.setCoordinates([
            [
              start,
              [start[0], end[1]],
              end,
              [end[0], start[1]],
              start
            ]
          ]);
          return geometry;
        };
      }

      shapeDraw = new ol.interaction.Draw({
        source: that.layer.getSource(),
        type: type,                                //几何图形类型
        geometryFunction: geometryFunction,             //几何信息变更时的回调函数
        maxPoints: maxPoints,                            //最大点数
        style: type != 'Point' ? this._toolStyle({ type: 'line' }) : this._toolStyle({ type: 'text', img: opt.img })
      });

      this._initShapePopup()

      shapeDraw.on('drawstart', (evt) => {
      })

      shapeDraw.on('drawend', (evt) => {
        this.clearShapeDraw()
        this.clearMeasureDraw()
        let center = []
        let feature = evt.feature;
        let geometry = feature.getGeometry();
        const id = getRandom(1, 10000) + new Date().getTime()
        feature.setId(opt.img ? opt.img + '%%' + id : id)

        if (typeCopy != 'Point') {
          feature.setStyle(that._toolStyle({ ...opt, type: 'line' }))
        } else {
          feature.setStyle(that._toolStyle({ ...opt, type: 'text' }))
        }

        if (typeCopy == 'Point') {
          //center = this._getDrawCenter(feature)
          coordinate = geometry.getCoordinates();
          setTimeout(() => {   //阻止右键触发描点操作
            if (this.isRight) {
              this.removeFeature(feature)
              return
            }
            opt.success && opt.success(coordinate, geometry, feature, feature.getId())
          }, 60)
        } else if (typeCopy !== 'Circle') {
          feature.type = "region"
          coordinate = geometry.getCoordinates();
          if (typeCopy == 'Rectangle') { //矩形
            center = coordinate[0][3]
          } else {
            center = coordinate[0][1]
          }
          opt.success && opt.success(coordinate, geometry, feature, feature.getId())
        } else {
          feature.type = "region"
          coordinate = geometry.getCenter()
          radius = geometry.getRadius()
          opt.success && opt.success([coordinate, radius], geometry, feature, feature.getId())
          center = [coordinate[0] + radius * 0.87, coordinate[1] + radius * 0.5]
        }
        if (typeCopy == 'Polygon') {
          // shapeElem.innerHTML = `<div class="tools-bar">
          //     <i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i>
          //     <i center="${center}" typeId="${feature.getId()}" class='ivu-icon ivu-icon-ios-more ico-more more'></i>
          //   </div>`
          shapeElem.innerHTML = `<div class="tools-bar">
            <i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-checkmark ico-sure checkmark'></i>
            <i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i>
          </div>`;
          shapePopup.id = feature.getId()
          shapePopup.setPosition(center);
        } else {
          shapeElem.innerHTML = `<div class="tools-bar">
            <i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-checkmark ico-sure checkmark'></i>
            <i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i>
          </div>`;
          shapePopup.id = feature.getId()
          shapePopup.setOffset([-14, -6])
          shapePopup.setPosition(center);
        }
        shapeElem = null
        this._initShapePopup()

        //给feature邦定事件
        setTimeout(() => {
          let deleteElem = document.querySelectorAll('.tools-bar .delete')
          let moreElem = document.querySelectorAll('.tools-bar .more')
          let okElem = document.querySelectorAll('.tools-bar .checkmark')
          let layer = this.layer
          let source = layer.getSource()
          //给所有del邦定事件
          for (let i = 0; i < deleteElem.length; i++) {
            deleteElem[i].onclick = function (e) {
              let id = this.getAttribute('typeid')
              let feature = source.getFeatureById(id)
              opt.close && opt.close(feature, feature.getGeometry(), id)
              source.removeFeature(feature);
              Utils.remove(this.parentNode.parentNode)
              if (operPopup) {
                operPopup.setPosition(undefined)
              }
            }
          }
          //给所有more邦定事件
          for (let i = 0; i < moreElem.length; i++) {
            moreElem[i].onclick = function (e) {
              let id = this.getAttribute('typeid')
              let center = this.getAttribute('center').split(',')
              let feature = source.getFeatureById(id)
              opt.more && opt.more(feature, feature.getGeometry())
              operPopup.setOffset([30, 0])
              operPopup.setPosition([center[0] * 1, center[1] * 1])
            }
          }

          for (let i = 0; i < okElem.length; i++) {
            okElem[i].onclick = function (e) {
              let id = this.getAttribute('typeid')
              let feature = source.getFeatureById(id)
              opt.onOk && opt.onOk(feature, feature.getGeometry())
            }
          }
        })
      })

      Map.map.addInteraction(shapeDraw)
    } else {
      //清空绘制的图形
      source.clear();
    }
  },

  //漫游
  handleRoaming() {
    this.clearMeasureDraw()
    this.clearShapeDraw()
  },

  //开启鹰眼导航
  handleNavigate() {
    let overview = Map.map.getControls().array_[5]
    let collapsed = overview.getCollapsed()
    overview.setCollapsed(!collapsed)
  },

  //定位
  handleLocation(point) {
    const view = Map.map.getView()
    const _point = Utils.tranEPSG3857(point)
    this._initDisPopup()
    let feature = new ol.Feature({
      type: 'location',
      geometry: new ol.geom.Point(_point)
    })
    feature.setStyle(this._toolStyle({ type: 'location' }))
    view.animate({
      center: _point,
      duration: 600
    })
    this.layer.getSource().addFeature(feature)
  },

  //文字
  handleText(opt) {
    const view = Map.map.getView()
    const _point = opt.point
    let feature = new ol.Feature({
      ...opt,
      geometry: new ol.geom.Point(_point)
    })
    feature.setId(opt.id)
    feature.setStyle(this._toolStyle({ ...opt, type: 'text' }))
    view.animate({
      center: _point,
      duration: 600
    })
    this.layer.getSource().addFeature(feature)
  },

  //格式化测量
  clearMeasureDraw(opt = { isClear: false }) {
    const { isClear } = opt
    if (!this.layer) return
    const source = this.layer.getSource()
    if (measureDraw) {
      Map.map.removeInteraction(measureDraw)
      if (isClear) {
        source.clear();
        Map.map.getOverlays().clear()
      }
    }
  },

  //格式化绘制形状
  clearShapeDraw(opt = { isClear: false }) {
    const { isClear } = opt
    if (!this.layer) return
    const source = this.layer.getSource()
    if (shapeDraw) {
      Map.map.removeInteraction(shapeDraw)
    }
    if (isClear) {
      source.clear();
      Map.map.getOverlays().clear()
    }
  },

  //通过id删除对应feature
  clearDrawById(id) {
    let source = this.layer.getSource()
    let feature = source.getFeatureById(id)
    if (feature) {
      source.removeFeature(feature)
    }
  },

  //删除对应的overlayer
  clearOverlayById(id) {
    let overlays = Map.map.getOverlays().array_
    overlays.map(item => {
      if (item.id == id) {
        Map.map.removeOverlay(item)
      }
    })
  },

  //工具回显
  showShapeByType(list) {
    let tools = {
      'Polygon': (opt) => {
        this._showPolygon(opt)
      },
      'Rectangle': (opt) => {
        this._showPolygon(opt)
      },
      'Text': (opt) => {
        this._showText(opt)
      },
      'Circle': (opt) => {
        this._showCircle(opt)
      }
    }
    tools[list.type](list)
  },

  //回显多边形
  _showPolygon(opt) {
    const { content, id, isShowClose } = opt
    const points = JSON.parse(content)
    let feature = new ol.Feature({ //路线
      geometry: new ol.geom.Polygon(points),
    });
    feature.setId(id)
    feature.setStyle(this._toolStyle({
      ...opt, type: 'line'
    }))
    if (isShowClose) {
      this._initShapePopup()
      let center = point[0][1]
      shapeElem.innerHTML = `<div class="tools-bar"><i typeId="closeOperPopup}" class='ivu-icon ivu-icon-md-close ico-del delete'></i></div>`;
      shapePopup.setPosition(center);
      shapeElem = null
      this._initShapePopup()
    }

    this.layer.getSource().addFeature(feature)
  },

  //回显圆形
  _showCircle(opt) {
    const { id, content, isShowClose } = opt
    const points = JSON.parse(content)
    let feature = new ol.Feature({
      geometry: new ol.geom.Circle(points[0], points[1]),
    })
    feature.setId(id)
    feature.setStyle(this._toolStyle({
      ...opt, type: 'line'
    }))
    if (isShowClose) {
      let center = [points[0][0] + radius * 0.87, points[0][1] + radius * 0.5]
      this._initShapePopup()
      shapeElem.innerHTML = `<div class="tools-bar"><i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i></div>`;

      shapePopup.setPosition(center);
      shapeElem = null
      this._initShapePopup()
    }

    this.layer.getSource().addFeature(feature)
  },

  //回显点坐标
  _showText(opt) {
    const { content, id, zdy } = opt
    const img = zdy.split('%%').length ? zdy.split('%%')[0] : ''
    const args = JSON.parse(content)
    let feature = new ol.Feature({
      geometry: new ol.geom.Point(args.point)
    })
    feature.setId(id)
    feature.setStyle(this._toolStyle({
      ...args, type: 'text', img
    }))
    // this._initShapePopup()
    // shapeElem.innerHTML = `<div class="shape"><i typeId="${feature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i></div>`;
    // shapePopup.setPosition(args.point);
    // shapeElem = null
    // this._initShapePopup()

    this.layer.getSource().addFeature(feature)
  },

  /**
   * 测距气泡层
   * @param {*} target
   */
  _initDisPopup() {
    disElem = document.createElement("div");
    disElem.className = "tooltip tooltip-measure";
    disPopup = new ol.Overlay({
      element: disElem,
      offset: [0, -15],
      positioning: "bottom-center"
    })
    Map.map.addOverlay(disPopup)
  },

  /**
   * 初始右键操作列表
   */
  _initOperPopup() {
    operPopup = new ol.Overlay({
      element: document.getElementById('operList'),
      auto: true,
      autoPanMargin: 20,
      offset: [0, 0],
      positioning: 'top-right'
    })
    Map.map.addOverlay(operPopup)
  },

  /**
   * 绘制气泡层
   */
  _initShapePopup() {
    if (shapeElem) {
      shapeElem.parentNode.removeChild(shapeElem);
    }
    shapeElem = document.createElement("div");
    shapePopup = new ol.Overlay({
      element: shapeElem,
      offset: [0, 0],
      positioning: "bottom-center"
    })
    Map.map.addOverlay(shapePopup)
  },

  /**
 * 获取图形中心点
 */
  _getDrawCenter(feature) {
    let extent = ol.extent.boundingExtent(feature.getGeometry().getCoordinates()[0])
    return ol.extent.getCenter(extent);
  },

  /**
   * 移出feature
   */
  removeFeature(feature) {
    this.layer.getSource().removeFeature(feature)
  },

  /**
   * 工具样式
   * @param {*} opt
   */
  _toolStyle(opt) {
    const { type } = opt
    let styles = {
      'line': (opt) => {
        return new ol.style.Style({
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.3)'
          }),
          stroke: new ol.style.Stroke({
            color: '#ec5661',
            width: 2,
            lineDash: [opt.dashed ? opt.dashed : 0]
          }),
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
              color: '#ec5661'
            })
          })
        })
      },
      'location': (opt) => {
        return new ol.style.Style({
          image: new ol.style.Icon({
            crossOrigin: "anonymous",
            anchor: [0.5, 0.5],
            imgSize: [30, 30],
            src: this.allImgs['location']
          }),
          zIndex: 5
        })
      },
      'text': (opt) => {
        return new ol.style.Style({
          image: new ol.style.Icon({
            crossOrigin: "anonymous",
            anchor: [0.5, 0.5],
            imgSize: [30, 30],
            src: opt.img ? (opt.img * 1 + '' == 'NaN' ? opt.img : this.allImgs['text']) : this.allImgs['text']
          }),
          text: new ol.style.Text({
            font: '15px Microsoft YaHei',
            text: opt.text,
            offsetX: 20,
            textAlign: 'left',
            fill: new ol.style.Fill({
              color: '#fff'
            })
          }),
          zIndex: 5
        })
      }
    }
    return styles[type](opt)
  }
}

Map.Tools = Tools

export default Tools