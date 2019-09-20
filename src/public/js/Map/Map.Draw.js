import Map from './Map.Setting'
import { tranEPSG4326,tranEPSG3857,remove } from './Map.Util';

const Draw = {}
Draw.layer = null;
Draw.source = new ol.source.Vector({ wrapX: false });
let draw = null
let shapePopup = null, shapeElem = null, shapeDraw = null
let features = []


const colorStyle = function (lineColor = '#2d8cf0', fillColor = 'rgba(255, 255, 255, 0.3)',lineDashed) {
  return new ol.style.Style({
    fill: new ol.style.Fill({               //填充样式
      color: fillColor
    }),
    stroke: new ol.style.Stroke({           //线样式
      color: lineColor,
      width: 1,
      lineDash: [lineDashed] || [0]
    }),
    image: new ol.style.Circle({            //点样式
      radius: 7,
      fill: new ol.style.Fill({
        color: lineColor
      })
    }),
    zIndex:-1
  })
}

//循环转换4326绘制完成的坐标
const loopTransArray4326 = (coordinates) =>{
  return coordinates.map(v=> tranEPSG4326(v))
}

//循环转换3857绘制完成的坐标
const loopTransArray3857 = (coordinates) =>{
  return coordinates.map(v=>tranEPSG3857(v))
}


/**
 * 初始化图层
 */
Draw.init = function (opt = {}) {
  if (Draw.layer) {
    features = []
    Draw.layer.getSource().clear()
    Draw.removeInteraction()
    Map.map.removeLayer(Draw.layer)
  }
  const { lineColor, fillColor } = opt
  Draw.layer = new ol.layer.Vector({
    id: "drawLayer",
    source: opt.source || Draw.source,
    style: colorStyle(lineColor, fillColor)
  })
  Map.map.addLayer(Draw.layer)
  //Draw.addInteraction({type:"Circle"})
}

/**
 * 绘制各种形状适量图
 * Point:点  LineString:线  Polygon:多边形 Circle:圆, Rectangle:矩形
 */
Draw.addInteraction = function (opt) {
  let { type, lineColor, fillColor, id } = opt
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

    draw = new ol.interaction.Draw({
      source: Draw.source,
      type: type,                                //几何图形类型
      geometryFunction: geometryFunction,             //几何信息变更时的回调函数
      maxPoints: maxPoints,                            //最大点数
      style: colorStyle(lineColor, fillColor)
    });

    draw.on('drawstart', (evt) => {
      // if (features.length) {  //删除上一个绘画图层
      //   Draw.layer.getSource().removeFeature(features[0])
      //   features.pop()
      // }
    })
    draw.on('drawend', (evt) => {
      let feature = evt.feature;
      let geometry = feature.getGeometry();
      //features.push(feature)

      if (typeCopy !== 'Circle') {
        coordinate = geometry.getCoordinates();
        if (typeCopy == 'Point') {
          coordinate = [[coordinate]]
        } else if (typeCopy == 'LineString') {
          coordinate = [coordinate]
        }
        coordinate = loopTransArray4326(coordinate[0])
        opt.success && opt.success(coordinate,geometry)
      } else {
        coordinate = tranEPSG4326(geometry.getCenter())
        radius = tranEPSG4326([geometry.getRadius(),0])
        opt.success && opt.success(coordinate, geometry,radius[0])
      }
    })

    Map.map.addInteraction(draw)
  } else {
    //清空绘制的图形
    source.clear();
  }
}


/**
 * 根据坐标点绘制圆形
  * @param {*} id 围栏id
  * @param {*} points 中心坐标
  * @param {*} radius 半径
  * @param {*} name 围栏名
 */
Draw.showCircle = function (opt) {
  const { id, lineColor, fillColor, points, radius, name,close } = opt
  let circleFeature = new ol.Feature({ //路线
    geometry: new ol.geom.Circle(points, radius),
  })
  Map.map.getView().setCenter(points);
  //动态设置layer颜色
  Draw.layer || Draw.init()
  // Draw.layer.getStyle().getStroke().setColor(lineColor)
  circleFeature.setStyle(colorStyle(lineColor, fillColor))
  circleFeature.setId(id)

  if(close){
    this._initShapePopup()
    shapeElem.innerHTML = `<div class="shape"><i typeId="${circleFeature.getId()}" class='ivu-icon ivu-icon-md-close ico-del delete'></i></div>`;
    shapePopup.setPosition(points);
    shapeElem = null
    Draw._initShapePopup()

    //删除feature
    setTimeout(() => {
      let deleteElem = document.querySelectorAll('.shape .delete')
      let layer = this.layer
      let source = layer.getSource()
      for (let i = 0; i < deleteElem.length; i++) {
        deleteElem[i].onclick = function (e) {
          let id = this.getAttribute('typeid')
          let feature = source.getFeatureById(id)
          source.removeFeature(feature);
          remove(this.parentNode.parentNode)
        }
      }
    })

  }

  //将所有矢量图层添加进去
  Draw.layer.getSource().addFeature(circleFeature);
}

/**
 * 根据坐标点绘制点
 */
Draw.showPoint = function (opt) {
  const { points, lineColor, fillColor, id, name } = opt
  var pointFeature = new ol.Feature({ //路线
    geometry: new ol.geom.Point(points[0]),
  });
  Map.map.getView().setCenter(points[0]);
  //动态设置layer颜色
  Draw.layer || Draw.init()
  pointFeature.setStyle(colorStyle(lineColor, fillColor))
  pointFeature.setId(id)
  //将所有矢量图层添加进去
  Draw.layer.getSource().addFeature(pointFeature);
}

/**
 * 根据坐标点绘制线段
 */
Draw.showLine = function (opt) {
  const { points, lineColor, fillColor, id, name } = opt
  var lineFeature = new ol.Feature({ //路线
    geometry: new ol.geom.LineString(points, 'XY'),
  });
  Map.map.getView().setCenter(points[0]);
  //动态设置layer颜色
  Draw.layer || Draw.init()
  lineFeature.setStyle(colorStyle(lineColor, fillColor))
  //Draw.layer.getStyle().getStroke().setColor(lineColor)
  lineFeature.setId(id)
  //将所有矢量图层添加进去
  Draw.layer.getSource().addFeature(lineFeature);
}

/**
 * 根据坐标点绘制多边形
 */
Draw.showPolygon = function (opt) {
  let { id, lineColor, fillColor, points, name } = opt
  points = [loopTransArray3857(points[0])]
  //多边形的数据格式是[[[lng,lat],[lng,lat]……]]外围两个中括号
  var polygonFeature = new ol.Feature({ //路线
    geometry: new ol.geom.Polygon(points),
  })
  
  
  if(name){
    this._initShapePopup()
    let center = points[0][1]
    shapeElem.innerHTML = `<div class="shapeText shapes">${name}</div>`;
    shapePopup.setPosition(center);
    shapeElem = null
    this._initShapePopup()
  }

  //设置中心点
  Draw.setMapCenter(polygonFeature)
  //动态设置layer颜色
  Draw.layer || Draw.init()
  polygonFeature.setStyle(colorStyle(lineColor, fillColor))
  //Draw.layer.getStyle().getStroke().setColor(lineColor)
  polygonFeature.setId(id)
  Draw.layer.getSource().addFeature(polygonFeature);
}


/**
 * 清除绘制
 */
Draw.removeInteraction = function () {
  Draw.source.clear()
  if(draw){
    Map.map.removeInteraction(draw)
  }
}


Draw._initShapePopup = function() {
  if (shapeElem) {
    shapeElem.parentNode.removeChild(shapeElem);
  }
  shapeElem = document.createElement("div");
  shapePopup = new ol.Overlay({
    element: shapeElem,
    autoPanMargin: 20,
    offset: [-55, -30],
    positioning: "bottom-center"
  })
  Map.map.addOverlay(shapePopup)
}


Draw.setMapCenter = function (feature) {
  let extent = ol.extent.boundingExtent(feature.getGeometry().getCoordinates()[0])
  let center = ol.extent.getCenter(extent);
  Map.map.getView().setCenter(center);
}

Draw.clearAll = function(){
  Draw.source.clear()
}

Draw.closeOperPopup = function() {
  if(shapePopup){
    shapePopup.setPosition(undefined)
    let node = document.getElementsByClassName('shapes')
    document.body.removeChild(node)
  }
},


Map.Draw = Draw

export default Draw
