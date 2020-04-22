import './timelines.css';

import Kapsule from 'kapsule';

import {
  ascending as d3Ascending,
  max as d3Max,
  min as d3Min,
  range as d3Range
} from 'd3-array';
import {
  axisBottom as d3AxisBottom,
  axisLeft as d3AxisLeft,
  axisRight as d3AxisRight,
  axisTop as d3AxisTop
} from 'd3-axis';
import {
  scaleLinear as d3ScaleLinear,
  scaleOrdinal as d3ScaleOrdinal,
  scaleSequential as d3ScaleSequential,
  scalePoint as d3ScalePoint,
  scaleTime as d3ScaleTime,
  scaleUtc as d3ScaleUtc
} from 'd3-scale';

import {
  event as d3Event,
  mouse as d3Mouse,
  select as d3Select
} from 'd3-selection';
import {
  timeFormat as d3TimeFormat,
  utcFormat as d3UtcFormat
} from 'd3-time-format';
import d3Tip from 'd3-tip';
import { schemeCategory10, schemeDark2, interpolateRdYlBu } from 'd3-scale-chromatic';

import { moveToFront as MoveToFront, gradient as Gradient } from 'svg-utils';
import { fitToBox as TextFitToBox } from 'svg-text-fit';
import ColorLegend from 'd3-color-legend';
import TimeOverview from './time-overview.js';
import { alphaNumCmp } from './comparison.js';
import getCorrectTextColor from './textColor';

export default Kapsule({
  props: {
    photoData: {
      default: []
    },
    data: {
      default: [],
      onChange(data, state) {
        parseData(data);
        state.zoomX = [
          Math.min((state.zoomX && state.zoomX[0]), d3Min(state.completeFlatData, d => d.timeRange[0])),
          Math.max((state.zoomX && state.zoomX[1]), d3Max(state.completeFlatData, d => d.timeRange[1]))
        ];

        state.zoomY = [null, null];

        state.leftMargin = data.reduce((max, el) => Math.max(max, el.group.length), 0) * 7 + 10;
        if (state.overviewArea) {
          state.overviewArea
            .domainRange(state.zoomX)
            .currentSelection(state.zoomX);
        }

        state.colorPalette = [];
        const predefinedColors = ["#4285f4", "#db4437", "#f4b400", "#0f9d58", "#ab47bc", "#00acc1", "#ff7043", "#9e9d24", "#5c6bc0", "#f06292", "#00796b", "c2185b"];
        const amountOfShades = Math.floor([...new Set(state.completeFlatData.map(el => el.val))].length / 12);
        if (amountOfShades > 0) {
          predefinedColors.forEach(c => {
            state.colorPalette.push(c);
            for (let i = 1; i <= amountOfShades; i++) {
              state.colorPalette.push(increase_brightness(c, (i) * 15));
            }
          })
        } else {
          state.colorPalette = predefinedColors;
        }

        state.zColorScale = d3ScaleOrdinal(state.colorPalette);
        //
        function increase_brightness(hex, percent) {
          // strip the leading # if it's there
          hex = hex.replace(/^\s*#|\s*$/g, '');

          // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
          if (hex.length == 3) {
            hex = hex.replace(/(.)/g, '$1$1');
          }

          var r = parseInt(hex.substr(0, 2), 16),
            g = parseInt(hex.substr(2, 2), 16),
            b = parseInt(hex.substr(4, 2), 16);

          return '#' +
            ((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
            ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
            ((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
        }

        function parseData(rawData) {


          state.completeStructData = [];
          state.totalNLines = 0;
          state.completeFlatData = [];

          let dataWithLevels = [];
          rawData.forEach(g => {
            state.completeStructData.push({
              group: g.group,
              lines: [1]
            });
            state.totalNLines++;

            const flat = g.data.map(el => el.data.map(m => { return { timeRange: [new Date(m.timeRange[0]), new Date(m.timeRange[1])], val: m.val }; })).flat().sort((a, b) => a.timeRange[0] - b.timeRange[0]);

            if (g.settings.includes('flat')) {
              dataWithLevels.push(...flat.map(el => { return {group: g.group, ...el, label: 1}}));
            } else {  
              flat.forEach(el => {
                  const maxLevel = Math.max(1, ...dataWithLevels.filter(f => f.group === g.group).map(m => m.label));
                  let elementAdded = false;
                  for (let i = 1; i <= maxLevel; i++) {
                      let isIntersects = false;
                      dataWithLevels.filter(f => (f.label === i) && (f.group === g.group)).forEach(elwl => {
                          if (el.timeRange[0] < elwl.timeRange[1] && el.timeRange[1] > elwl.timeRange[0]) isIntersects = true;
                        });
                        if (!isIntersects) {
                            dataWithLevels.push({ group: g.group, ...el, label: i });
                            elementAdded = true;
                  break;
                }
              }
            
              if (!elementAdded) {
                  dataWithLevels.push({ group: g.group, ...el, label: maxLevel + 1 });
                  state.completeStructData.find(s => s.group === g.group).lines.push(maxLevel + 1);
                  state.totalNLines++;
                }
              })
            }


          });

          state.completeFlatData = dataWithLevels;

          // for (let i=0, ilen=rawData.length; i<ilen; i++) {
          //   const group = rawData[i].group;
          //   state.completeStructData.push({
          //     group: group,
          //     lines: rawData[i].data.map(d => d.label)
          //   });

          //   for (let j= 0, jlen=rawData[i].data.length; j<jlen; j++) {
          //     for (let k= 0, klen=rawData[i].data[j].data.length; k<klen; k++) {
          //       // state.completeFlatData.push({
          //       //   group: group,
          //       //   label: rawData[i].data[j].label,
          //       //   timeRange: rawData[i].data[j].data[k].timeRange.map(d => new Date(d)),
          //       //   val: rawData[i].data[j].data[k].val,
          //       //   labelVal: rawData[i].data[j].data[k][rawData[i].data[j].data[k].hasOwnProperty('labelVal')?'labelVal':'val']
          //       // });
          //     }
          //     state.totalNLines++;
          //   }
          // }
        }
      }
    },
    width: { default: window.innerWidth - 40 },
    maxHeight: { default: 640 },
    maxLineHeight: { default: 12 },
    leftMargin: { default: 90 },
    rightMargin: { default: 0 },
    topMargin: { default: 0 },
    bottomMargin: { default: 30 },
    useUtc: { default: false },
    xTickFormat: {},
    dateMarker: {},
    timeFormat: { default: '%Y-%m-%d %-I:%M:%S %p', triggerUpdate: false },
    zoomX: {  // Which time-range to show (null = min/max)
      default: [null, null],
      onChange(zoomX, state) {
        if (state.svg)
          state.svg.dispatch('zoom', {
            detail: {
              zoomX: zoomX,
              zoomY: null,
              redraw: false
            }
          });
      }
    },
    zoomY: {  // Which lines to show (null = min/max) [0 indexed]
      default: [null, null],
      onChange(zoomY, state) {
        if (state.svg)
          state.svg.dispatch('zoom', {
            detail: {
              zoomX: null,
              zoomY: zoomY,
              redraw: false
            }
          });
      }
    },
    minSegmentDuration: {},
    zColorScale: { default: d3ScaleSequential(interpolateRdYlBu) },
    zQualitative: {
      default: false,
      // onChange(discrete, state) {
      // state.zColorScale = discrete
      //   ? d3ScaleOrdinal([...schemeCategory10, ...schemeDark2 ])
      //   : d3ScaleSequential(interpolateRdYlBu); // alt: d3.interpolateInferno
      // }
    },
    zDataLabel: { default: '', triggerUpdate: false }, // Units of z data. Used in the tooltip descriptions
    zScaleLabel: { default: '', triggerUpdate: false }, // Units of colorScale. Used in the legend label
    enableOverview: { default: true }, // True/False
    enableAnimations: {
      default: true,
      onChange(val, state) {
        state.transDuration = val ? 700 : 0;
      }
    },

    // Callbacks
    onZoom: {}, // When user zooms in / resets zoom. Returns ([startX, endX], [startY, endY])
    onLabelClick: {}, // When user clicks on a group or y label. Returns (group) or (label, group) respectively
    onSegmentClick: {} // When user clicks on a segment. Returns (segment object) respectively
  },

  methods: {
    getNLines: s => s.nLines,
    getTotalNLines: s => s.totalNLines,
    getVisibleStructure: s => s.structData,
    getSvg: s => d3Select(s.svg.node().parentNode).html(),
    zoomYLabels(state, _) {
      if (!_) { return [y2Label(state.zoomY[0]), y2Label(state.zoomY[1])]; }
      return this.zoomY([label2Y(_[0], true), label2Y(_[1], false)]);

      //

      function y2Label(y) {

        if (y == null) return y;
        let cntDwn = y;
        for (let i = 0, len = state.completeStructData.length; i < len; i++) {
          if (state.completeStructData[i].lines.length > cntDwn)
            return getIdxLine(state.completeStructData[i], cntDwn);
          cntDwn -= state.completeStructData[i].lines.length;
        }

        // y larger than all lines, return last
        return getIdxLine(state.completeStructData[state.completeStructData.length - 1], state.completeStructData[state.completeStructData.length - 1].lines.length - 1);

        //

        function getIdxLine(grpData, idx) {
          return {
            'group': grpData.group,
            'label': grpData.lines[idx]
          };
        }
      }

      function label2Y(label, useIdxAfterIfNotFound) {

        useIdxAfterIfNotFound = useIdxAfterIfNotFound || false;
        const subIdxNotFound = useIdxAfterIfNotFound ? 0 : 1;

        if (label == null) return label;

        let idx = 0;
        for (let i = 0, lenI = state.completeStructData.length; i < lenI; i++) {
          const grpCmp = state.grpCmpFunction(label.group, state.completeStructData[i].group);
          if (grpCmp < 0) break;
          if (grpCmp == 0 && label.group == state.completeStructData[i].group) {
            for (let j = 0, lenJ = state.completeStructData[i].lines.length; j < lenJ; j++) {
              const cmpRes = state.labelCmpFunction(label.label, state.completeStructData[i].lines[j]);
              if (cmpRes < 0) {
                return idx + j - subIdxNotFound;
              }
              if (cmpRes == 0 && label.label == state.completeStructData[i].lines[j]) {
                return idx + j;
              }
            }
            return idx + state.completeStructData[i].lines.length - subIdxNotFound;
          }
          idx += state.completeStructData[i].lines.length;
        }
        return idx - subIdxNotFound;
      }
    },
    sort(state, labelCmpFunction, grpCmpFunction) {
      if (labelCmpFunction == null) { labelCmpFunction = state.labelCmpFunction }
      if (grpCmpFunction == null) { grpCmpFunction = state.grpCmpFunction }

      state.labelCmpFunction = labelCmpFunction;
      state.grpCmpFunction = grpCmpFunction;

      state.completeStructData.sort((a, b) => grpCmpFunction(a.group, b.group));

      for (let i = 0, len = state.completeStructData.length; i < len; i++) {
        state.completeStructData[i].lines.sort(labelCmpFunction);
      }

      state._rerender();

      return this;
    },
    sortAlpha(state, asc) {
      if (asc == null) { asc = true }
      const alphaCmp = function (a, b) { return alphaNumCmp(asc ? a : b, asc ? b : a); };
      return this.sort(alphaCmp, alphaCmp);
    },
    sortChrono(state, asc) {
      if (asc == null) { asc = true }

      function buildIdx(accessFunction) {
        const idx = {};
        for (let i = 0, len = state.completeFlatData.length; i < len; i++) {
          const key = accessFunction(state.completeFlatData[i]);
          if (idx.hasOwnProperty(key)) { continue; }

          const itmList = state.completeFlatData.filter(d => key == accessFunction(d));
          idx[key] = [
            d3Min(itmList, d => d.timeRange[0]),
            d3Max(itmList, d => d.timeRange[1])
          ];
        }
        return idx;
      }

      const timeCmp = function (a, b) {

        const aT = a[1], bT = b[1];

        if (!aT || !bT) return null; // One of the two vals is null

        if (aT[1].getTime() == bT[1].getTime()) {
          if (aT[0].getTime() == bT[0].getTime()) {
            return alphaNumCmp(a[0], b[0]); // If first and last is same, use alphaNum
          }
          return aT[0] - bT[0];   // If last is same, earliest first wins
        }
        return bT[1] - aT[1]; // latest last wins
      };

      function getCmpFunction(accessFunction, asc) {
        return (a, b) => timeCmp(accessFunction(asc ? a : b), accessFunction(asc ? b : a));
      }

      const grpIdx = buildIdx(d => d.group);
      const lblIdx = buildIdx(d => d.label);

      const grpCmp = getCmpFunction(d => [d, grpIdx[d] || null], asc);
      const lblCmp = getCmpFunction(d => [d, lblIdx[d] || null], asc);

      return this.sort(lblCmp, grpCmp);
    },
    overviewDomain(state, _) {
      if (!state.enableOverview) { return null; }

      if (!_) { return state.overviewArea.domainRange(); }
      state.overviewArea.domainRange(_);
      return this;
    },
    refresh(state) {
      state._rerender();
      return this;
    }
  },

  stateInit: {
    height: null,
    overviewHeight: 20, // Height of overview section in bottom
    minLabelFont: 2,
    groupBkgGradient: ['#FAFAFA', '#E0E0E0'],

    yScale: null,
    grpScale: null,

    xAxis: null,
    xGrid: null,
    yAxis: null,
    grpAxis: null,

    dateMarkerLine: null,

    svg: null,
    graph: null,
    overviewAreaElem: null,
    overviewArea: null,

    graphW: null,
    graphH: null,

    completeStructData: null,
    structData: null,
    completeFlatData: null,
    flatData: null,
    totalNLines: null,
    nLines: null,

    minSegmentDuration: 0, // ms

    transDuration: 700,   // ms for transition duration

    labelCmpFunction: alphaNumCmp,
    grpCmpFunction: alphaNumCmp
  },

  init(el, state) {
    const elem = d3Select(el)
      .attr('class', 'timelines-chart');

    state.svg = elem.append('svg');
    state.overviewAreaElem = elem.append('div');

    // Initialize scales and axes
    state.yScale = d3ScalePoint();
    state.grpScale = d3ScaleOrdinal();
    state.xAxis = d3AxisBottom();
    state.xGrid = d3AxisTop();
    state.yAxis = d3AxisRight();
    state.grpAxis = d3AxisLeft();

    buildDomStructure();
    addTooltips();
    addZoomSelection();
    setEvents();

    //

    function buildDomStructure() {

      state.yScale.invert = invertOrdinal;
      state.grpScale.invert = invertOrdinal;

      state.groupGradId = Gradient()
        .colorScale(d3ScaleLinear()
          .domain([0, 1])
          .range(state.groupBkgGradient))
        .angle(-90)
        (state.svg.node())
        .id();

      const axises = state.svg.append('g').attr('class', 'axises');
      axises.append('g').attr('class', 'x-axis');
      axises.append('g').attr('class', 'x-grid');
      axises.append('g').attr('class', 'y-axis');
      axises.append('g').attr('class', 'grp-axis');

      state.yAxis.scale(state.yScale)
        .tickSize(0);

      state.grpAxis.scale(state.grpScale)
        .tickSize(0);

      state.colorLegend = ColorLegend()
        (state.svg.append('g')
          .attr('class', 'legendG')
          .node()
        );

      state.graph = state.svg.append('g');

      state.dateMarkerLine = state.svg.append('line').attr('class', 'x-axis-date-marker');

      if (state.enableOverview) {
        addOverviewArea();
      }

      // Applies to ordinal scales (invert not supported in d3)
      function invertOrdinal(val, cmpFunc) {
        cmpFunc = cmpFunc || function (a, b) {
          return (a >= b);
        };

        const scDomain = this.domain();
        let scRange = this.range();

        if (scRange.length === 2 && scDomain.length !== 2) {
          // Special case, interpolate range vals
          scRange = d3Range(scRange[0], scRange[1], (scRange[1] - scRange[0]) / scDomain.length);
        }

        const bias = scRange[0];
        for (let i = 0, len = scRange.length; i < len; i++) {
          if (cmpFunc(scRange[i] + bias, val)) {
            return scDomain[Math.round(i * scDomain.length / scRange.length)];
          }
        }

        return this.domain()[this.domain().length - 1];
      }

      function addOverviewArea() {
        state.overviewArea = TimeOverview()
          .margins({ top: 1, right: 20, bottom: 20, left: 20 })
          .onChange((startTime, endTime) => {
            state.svg.dispatch('zoom', {
              detail: {
                zoomX: [startTime, endTime],
                zoomY: null
              }
            });
          })
          .domainRange(state.zoomX)
          .currentSelection(state.zoomX)
          (state.overviewAreaElem.node());

        state.svg.on('zoomScent', function () {
          const zoomX = d3Event.detail.zoomX;

          if (!state.overviewArea || !zoomX) return;

          // Out of overview bounds > extend it
          if (zoomX[0] < state.overviewArea.domainRange()[0] || zoomX[1] > state.overviewArea.domainRange()[1]) {
            state.overviewArea.domainRange([
              new Date(Math.min(zoomX[0], state.overviewArea.domainRange()[0])),
              new Date(Math.max(zoomX[1], state.overviewArea.domainRange()[1]))
            ]);
          }

          state.overviewArea.currentSelection(zoomX);
        });
      }
    }

    function addTooltips() {
      // state.groupTooltip = d3Tip()
      //   .attr('class', 'chart-tooltip group-tooltip')
      //   .direction('w')
      //   .offset([0, 0])
      //   .html(d => {
      //     const leftPush = (d.hasOwnProperty('timeRange')
      //       ?state.xScale(d.timeRange[0])
      //       :0
      //     );
      //     const topPush = (d.hasOwnProperty('label')
      //       ?state.grpScale(d.group)-state.yScale(d.group+'+&+'+d.label)
      //       :0
      //     );
      //     state.groupTooltip.offset([topPush, -leftPush]);
      //     return d.group;
      //   });

      // state.svg.call(state.groupTooltip);

      // state.lineTooltip = d3Tip()
      //   .attr('class', 'chart-tooltip line-tooltip')
      //   .direction('e')
      //   .offset([0, 0])
      //   .html(d => {
      //     const rightPush = (d.hasOwnProperty('timeRange')?state.xScale.range()[1]-state.xScale(d.timeRange[1]):0);
      //     state.lineTooltip.offset([0, rightPush]);
      //     return d.label;
      //   });

      // state.svg.call(state.lineTooltip);

      state.segmentTooltip = d3Tip()
        .attr('class', 'chart-tooltip segment-tooltip')
        .direction('s')
        .offset([5, 0])
        .html(d => {
          // const normVal = state.zColorScale.domain()[state.zColorScale.domain().length-1] - state.zColorScale.domain()[0];
          // const dateFormat = (state.useUtc ? d3UtcFormat : d3TimeFormat)(`${state.timeFormat}${state.useUtc?' (UTC)':''}`);
          const timeFormat = d3TimeFormat('%Y-%m-%d %H:%M:%S');
          return d.group + '<br>'
            + d.val + '<br>'
            // + (normVal?' (<strong>' + Math.round((d.val-state.zColorScale.domain()[0])/normVal*100*100)/100 + '%</strong>)':'') + '<br>'
            + 'от: ' + timeFormat(d.timeRange[0]) + '<br>'
            + 'до: ' + timeFormat(d.timeRange[1]) + '<br>'
            + 'продолжительность: ' + Math.round((d.timeRange[1] - d.timeRange[0]) / 1000 / 60);
        });

      state.svg.call(state.segmentTooltip);
    }

    function addZoomSelection() {

      state.graph.on('mousedown', function () {
        if (d3Select(window).on('mousemove.zoomRect') != null) // Selection already active
          return;

        const e = this;

        if (d3Mouse(e)[0] < 0 || d3Mouse(e)[0] > state.graphW || d3Mouse(e)[1] < 0 || d3Mouse(e)[1] > state.graphH)
          return;

        state.disableHover = true;

        const rect = state.graph.append('rect')
          .attr('class', 'chart-zoom-selection');

        const startCoords = d3Mouse(e);

        d3Select(window)
          .on('mousemove.zoomRect', function () {
            d3Event.stopPropagation();
            const newCoords = [
              Math.max(0, Math.min(state.graphW, d3Mouse(e)[0])),
              Math.max(0, Math.min(state.graphH, d3Mouse(e)[1]))
            ];
            rect.attr('x', Math.min(startCoords[0], newCoords[0]))
              .attr('y', Math.min(startCoords[1], newCoords[1]))
              .attr('width', Math.abs(newCoords[0] - startCoords[0]))
              .attr('height', Math.abs(newCoords[1] - startCoords[1]));

            state.svg.dispatch('zoomScent', {
              detail: {
                zoomX: [startCoords[0], newCoords[0]].sort(d3Ascending).map(state.xScale.invert),
                zoomY: [startCoords[1], newCoords[1]].sort(d3Ascending).map(d =>
                  state.yScale.domain().indexOf(state.yScale.invert(d))
                  + ((state.zoomY && state.zoomY[0]) ? state.zoomY[0] : 0)
                )
              }
            });
          })
          .on('mouseup.zoomRect', function () {
            d3Select(window).on('mousemove.zoomRect', null).on('mouseup.zoomRect', null);
            d3Select('body').classed('stat-noselect', false);
            rect.remove();
            state.disableHover = false;

            const endCoords = [
              Math.max(0, Math.min(state.graphW, d3Mouse(e)[0])),
              Math.max(0, Math.min(state.graphH, d3Mouse(e)[1]))
            ];

            if (startCoords[0] == endCoords[0] && startCoords[1] == endCoords[1])
              return;

            const newDomainX = [startCoords[0], endCoords[0]].sort(d3Ascending).map(state.xScale.invert);

            const newDomainY = [startCoords[1], endCoords[1]].sort(d3Ascending).map(d =>
              state.yScale.domain().indexOf(state.yScale.invert(d))
              + ((state.zoomY && state.zoomY[0]) ? state.zoomY[0] : 0)
            );

            const changeX = ((newDomainX[1] - newDomainX[0]) > (60 * 1000)); // Zoom damper
            const changeY = (newDomainY[0] != state.zoomY[0] || newDomainY[1] != state.zoomY[1]);

            if (changeX || changeY) {
              state.svg.dispatch('zoom', {
                detail: {
                  zoomX: changeX ? newDomainX : null,
                  zoomY: changeY ? newDomainY : null
                }
              });
            }
          }, true);

        d3Event.stopPropagation();
      });

      state.resetBtn = state.svg.append('text')
        .attr('class', 'reset-zoom-btn')
        .text('Сбросить масштаб')
        .style('text-anchor', 'end')
        .on('mouseup', function () {
          state.svg.dispatch('resetZoom');
        })
        .on('mouseover', function () {
          d3Select(this).style('opacity', 1);
        })
        .on('mouseout', function () {
          d3Select(this).style('opacity', .6);
        });

      state.graph.on('dblclick', function () {
        state.svg.dispatch('resetZoom');
      });
    }

    function setEvents() {

      state.svg.on('zoom', function () {
        const evData = d3Event.detail,
          zoomX = evData.zoomX,
          zoomY = evData.zoomY,
          redraw = (evData.redraw == null) ? true : evData.redraw;

        if (!zoomX && !zoomY) return;

        if (zoomX) state.zoomX = zoomX;
        if (zoomY) state.zoomY = zoomY;

        state.svg.dispatch('zoomScent', {
          detail: {
            zoomX: zoomX,
            zoomY: zoomY
          }
        });

        if (!redraw) return;

        state._rerender();
        if (state.onZoom) state.onZoom(state.zoomX, state.zoomY);
      });

      state.svg.on('resetZoom', function () {
        const prevZoomX = state.zoomX;
        const prevZoomY = state.zoomY || [null, null];

        const newZoomX = state.enableOverview
          ? state.overviewArea.domainRange()
          : [
            d3Min(state.flatData, d => d.timeRange[0]),
            d3Max(state.flatData, d => d.timeRange[1])
          ],
          newZoomY = [null, null];

        if (prevZoomX[0] < newZoomX[0] || prevZoomX[1] > newZoomX[1]
          || prevZoomY[0] != newZoomY[0] || prevZoomY[1] != newZoomX[1]) {

          state.zoomX = [
            new Date(Math.min(prevZoomX[0], newZoomX[0])),
            new Date(Math.max(prevZoomX[1], newZoomX[1]))
          ];
          state.zoomY = newZoomY;
          state.svg.dispatch('zoomScent', {
            detail: {
              zoomX: state.zoomX,
              zoomY: state.zoomY
            }
          });

          state._rerender();
        }

        if (state.onZoom) state.onZoom(null, null);
      });
    }
  },

  update(state) {

    applyFilters();
    setupDimensions();

    adjustXScale();
    adjustYScale();
    adjustGrpScale();

    renderAxises();
    renderGroups();

    renderTimelines();
    renderPhotoSpots();

    // adjustLegend();

    //

    function applyFilters() {
      // Flat data based on segment length
      state.flatData = (state.minSegmentDuration > 0
        ? state.completeFlatData.filter(d => (d.timeRange[1] - d.timeRange[0]) >= state.minSegmentDuration)
        : state.completeFlatData
      );

      // zoomY
      if (state.zoomY == null || state.zoomY == [null, null]) {
        state.structData = state.completeStructData;
        state.nLines = 0;
        for (let i = 0, len = state.structData.length; i < len; i++) {
          state.nLines += state.structData[i].lines.length;
        }
        return;
      }

      state.structData = [];
      const cntDwn = [state.zoomY[0] == null ? 0 : state.zoomY[0]]; // Initial threshold
      cntDwn.push(Math.max(0, (state.zoomY[1] == null ? state.totalNLines : state.zoomY[1] + 1) - cntDwn[0])); // Number of lines
      state.nLines = cntDwn[1];
      for (let i = 0, len = state.completeStructData.length; i < len; i++) {

        let validLines = state.completeStructData[i].lines;

        if (state.minSegmentDuration > 0) {  // Use only non-filtered (due to segment length) groups/labels
          if (!state.flatData.some(d => d.group == state.completeStructData[i].group)) {
            continue; // No data for this group
          }

          validLines = state.completeStructData[i].lines
            .filter(d => state.flatData.some(dd =>
              dd.group == state.completeStructData[i].group && dd.label == d
            )
            );
        }

        if (cntDwn[0] >= validLines.length) { // Ignore whole group (before start)
          cntDwn[0] -= validLines.length;
          continue;
        }

        const groupData = {
          group: state.completeStructData[i].group,
          lines: null
        };

        if (validLines.length - cntDwn[0] >= cntDwn[1]) {  // Last (or first && last) group (partial)
          groupData.lines = validLines.slice(cntDwn[0], cntDwn[1] + cntDwn[0]);
          state.structData.push(groupData);
          cntDwn[1] = 0;
          break;
        }

        if (cntDwn[0] > 0) {  // First group (partial)
          groupData.lines = validLines.slice(cntDwn[0]);
          cntDwn[0] = 0;
        } else {  // Middle group (full fit)
          groupData.lines = validLines;
        }

        state.structData.push(groupData);
        cntDwn[1] -= groupData.lines.length;
      }

      state.nLines -= cntDwn[1];
    }

    function setupDimensions() {
      state.graphW = state.width - state.leftMargin - state.rightMargin;
      state.graphH = d3Min([state.nLines * state.maxLineHeight, state.maxHeight - state.topMargin - state.bottomMargin]);
      state.height = state.graphH + state.topMargin + state.bottomMargin;

      state.svg.transition().duration(state.transDuration)
        .attr('width', state.width)
        .attr('height', state.height);

      state.graph.attr('transform', 'translate(' + state.leftMargin + ',' + state.topMargin + ')');

      if (state.overviewArea) {
        state.overviewArea
          .width(state.width * 0.8)
          .height(state.overviewHeight + state.overviewArea.margins().top + state.overviewArea.margins().bottom);
      }
    }

    function adjustXScale() {
      state.zoomX[0] = state.zoomX[0] || d3Min(state.flatData, d => d.timeRange[0]);
      state.zoomX[1] = state.zoomX[1] || d3Max(state.flatData, d => d.timeRange[1]);

      state.xScale = (state.useUtc ? d3ScaleUtc : d3ScaleTime)()
        .domain(state.zoomX)
        .range([0, state.graphW])
        .clamp(true);

      if (state.overviewArea) {
        state.overviewArea
          .scale(state.xScale.copy())
          .tickFormat(state.xTickFormat);
      }
    }

    function adjustYScale() {
      let labels = [];
      for (let i = 0, len = state.structData.length; i < len; i++) {
        labels = labels.concat(state.structData[i].lines.map(function (d) {
          return state.structData[i].group + '+&+' + d
        }));
      }

      state.yScale.domain(labels);
      state.yScale.range([state.graphH / labels.length * 0.5, state.graphH * (1 - 0.5 / labels.length)]);
    }

    function adjustGrpScale() {
      state.grpScale.domain(state.structData.map(d => d.group));

      let cntLines = 0;
      state.grpScale.range(state.structData.map(d => {
        const pos = (cntLines + d.lines.length / 2) / state.nLines * state.graphH;
        cntLines += d.lines.length;
        return pos;
      }));
    }

    function adjustLegend() {
      state.svg.select('.legendG')
        .transition().duration(state.transDuration)
        .attr('transform', `translate(${state.leftMargin + state.graphW * 0.05},2)`);

      state.colorLegend
        .width(Math.max(120, state.graphW / 3 * (state.zQualitative ? 2 : 1)))
        .height(state.topMargin * .6)
        .scale(state.zColorScale)
        .label(state.zScaleLabel);

      state.resetBtn
        .transition().duration(state.transDuration)
        .attr('x', state.leftMargin + state.graphW * .99)
        .attr('y', state.topMargin * .8);

      TextFitToBox()
        .bbox({
          width: state.graphW * .4,
          height: Math.min(13, state.topMargin * .8)
        })
        (state.resetBtn.node());
    }

    function renderAxises() {

      state.svg.select('.axises')
        .attr('transform', 'translate(' + state.leftMargin + ',' + state.topMargin + ')');

      // X
      state.xAxis
        .scale(state.xScale)
        .ticks(Math.round(state.graphW * 0.0011))
        .tickFormat(state.xTickFormat);
      state.xGrid
        .scale(state.xScale)
        .ticks(state.xAxis.ticks()[0])
        .tickFormat('');

      state.svg.select('g.x-axis')
        .style('stroke-opacity', 0)
        .style('fill-opacity', 0)
        .attr('transform', 'translate(0,' + state.graphH + ')')
        .transition().duration(state.transDuration)
        .call(state.xAxis)
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      /* Angled x axis labels
       state.svg.select('g.x-axis').selectAll('text')
       .style('text-anchor', 'end')
       .attr('transform', 'translate(-10, 3) rotate(-60)');
       */

      state.xGrid.tickSize(state.graphH);
      state.svg.select('g.x-grid')
        .attr('transform', 'translate(0,' + state.graphH + ')')
        .transition().duration(state.transDuration)
        .call(state.xGrid);

      if (
        state.dateMarker &&
        state.dateMarker >= state.xScale.domain()[0] &&
        state.dateMarker <= state.xScale.domain()[1]
      ) {
        state.dateMarkerLine
          .style('display', 'block')
          .transition().duration(state.transDuration)
          .attr('x1', state.xScale(state.dateMarker) + state.leftMargin)
          .attr('x2', state.xScale(state.dateMarker) + state.leftMargin)
          .attr('y1', state.topMargin + 1)
          .attr('y2', state.graphH + state.topMargin)
      } else {
        state.dateMarkerLine.style('display', 'none');
      }

      // Y
      const fontVerticalMargin = 0.6;
      const labelDisplayRatio = Math.ceil(state.nLines * state.minLabelFont / Math.sqrt(2) / state.graphH / fontVerticalMargin);
      const tickVals = state.yScale.domain().filter((d, i) => !(i % labelDisplayRatio));
      let fontSize = Math.min(12, state.graphH / tickVals.length * fontVerticalMargin * Math.sqrt(2));
      let maxChars = Math.ceil(state.rightMargin / (fontSize / Math.sqrt(2)));

      // state.yAxis.tickValues(tickVals);
      // state.yAxis.tickFormat(d => reduceLabel(d.split('+&+')[1], maxChars));
      // state.svg.select('g.y-axis')
      //   .transition().duration(state.transDuration)
      //     .attr('transform', 'translate(' + state.graphW + ', 0)')
      //     .style('font-size', fontSize + 'px')
      //     .call(state.yAxis);

      // Grp
      const minHeight = d3Min(state.grpScale.range(), function (d, i) {
        return i > 0 ? d - state.grpScale.range()[i - 1] : d * 2;
      });
      fontSize = Math.min(14, minHeight * fontVerticalMargin * Math.sqrt(2));
      maxChars = Math.floor(state.leftMargin / (fontSize / Math.sqrt(2)));

      // state.grpAxis.tickFormat(d => reduceLabel(d, maxChars));
      state.grpAxis.tickFormat(d => d);
      state.svg.select('g.grp-axis')
        .transition().duration(state.transDuration)
        .style('font-size', fontSize + 'px')
        .call(state.grpAxis);

      // Make Axises clickable
      if (state.onLabelClick) {
        state.svg.selectAll('g.y-axis,g.grp-axis').selectAll('text')
          .style('cursor', 'pointer')
          .on('click', function (d) {
            const segms = d.split('+&+');
            state.onLabelClick(...segms.reverse());
          });
      }

      //

      function reduceLabel(label, maxChars) {
        return label.length <= maxChars ? label : (
          label.substring(0, maxChars * 2 / 3)
          + '...'
          + label.substring(label.length - maxChars / 3, label.length
          ));
      }
    }

    function renderGroups() {

      let groups = state.graph.selectAll('rect.series-group').data(state.structData, d => d.group);

      groups.exit()
        .transition().duration(state.transDuration)
        .style('stroke-opacity', 0)
        .style('fill-opacity', 0)
        .remove();

      const newGroups = groups.enter().append('rect')
        .attr('class', 'series-group')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', 0)
        .style('fill', 'url(#' + state.groupGradId + ')')
      // .on('mouseover', state.groupTooltip.show)
      // .on('mouseout', state.groupTooltip.hide);

      newGroups.append('title')
        .text('выделите область для приближения');

      groups = groups.merge(newGroups);

      groups.transition().duration(state.transDuration)
        .attr('width', state.graphW)
        .attr('height', function (d) {
          return state.graphH * d.lines.length / state.nLines;
        })
        .attr('y', function (d) {
          return state.grpScale(d.group) - state.graphH * d.lines.length / state.nLines / 2;
        });
    }

    function renderPhotoSpots() {

      const dataFilter = (d, i) =>
        new Date(d.Photo_timestamp) >= state.xScale.domain()[0] &&
        new Date(d.Photo_timestamp) <= state.xScale.domain()[1];

      state.graph.selectAll('g .photo-spot').remove();
      let spots = state.graph.selectAll('g .photo-spot')
        .data(
          state.photoData.filter(dataFilter),
          d => d.Photo_timestamp
        );

      spots
        .enter()
        .append('circle')
        .attr('class', 'photo-spot')
        .attr('r', 2)
        .attr('cx', function (d) {
          return state.xScale(new Date(d.Photo_timestamp));
        })
        .attr('cy', function (d) {
          return state.graphH;
        })
        .style('fill', '#000')
        .style('fill-opacity', .8);

    }

    function renderTimelines(maxElems) {

      if (maxElems < 0) maxElems = null;

      const hoverEnlargeRatio = .4;

      const dataFilter = (d, i) =>
        (maxElems == null || i < maxElems) &&
        (state.grpScale.domain().indexOf(d.group) + 1 &&
          d.timeRange[1] >= state.xScale.domain()[0] &&
          d.timeRange[0] <= state.xScale.domain()[1] &&
          state.yScale.domain().indexOf(d.group + '+&+' + d.label) + 1);

      state.lineHeight = state.graphH / state.nLines * 0.8;

      let timelines = state.graph.selectAll('g.series-container').data(
        state.flatData.filter(dataFilter),
        d => d.group + d.label + d.timeRange[0]
      );

      timelines.exit()
        .transition().duration(state.transDuration)
        .style('opacity', 0)
        .remove();

      const newSegments = timelines.enter().append('g').attr('class', 'series-container')

      newSegments.append('rect')
        .attr('class', 'series-segment')
        .attr('x', () => state.graphW / 2)
        .attr('y', state.graphH / 2)
        .attr('width', 0)
        .attr('height', 0)
        .style('fill', d => state.zColorScale(d.val))
        .style('fill-opacity', 0)
        // .on('mouseover.groupTooltip', state.groupTooltip.show)
        // .on('mouseout.groupTooltip', state.groupTooltip.hide)
        // .on('mouseover.lineTooltip', state.lineTooltip.show)
        // .on('mouseout.lineTooltip', state.lineTooltip.hide)
        .on('mouseover.segmentTooltip', state.segmentTooltip.show)
        .on('mouseout.segmentTooltip', state.segmentTooltip.hide);

      function fitsIn(d) {
        const rectWidth = state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0]);
        const letterWidth = state.lineHeight * 0.3;
        const lettersToFit = Math.floor((rectWidth - 12) / letterWidth);
        return d.val.length <= lettersToFit;
      }

      function fitsLeft(d) {
        const localArr = state.completeFlatData.filter(el => (el.group === d.group) && (el.label === d.label));
        const localIdx = localArr.indexOf(d);
        const letterWidth = state.lineHeight * 0.3;

        const rectWidth = localIdx > 0
          ? state.xScale(d.timeRange[0]) - state.xScale(localArr[localIdx - 1].timeRange[1])
          : state.xScale(d.timeRange[0]);

        const lettersToFit = Math.floor((rectWidth - 12) / letterWidth);
        return d.val.length <= lettersToFit;
      }

      function fitsRight(d) {
        const localArr = state.completeFlatData.filter(el => (el.group === d.group) && (el.label === d.label));
        const localIdx = localArr.indexOf(d);
        const letterWidth = state.lineHeight * 0.3;
        const next = localArr[localIdx + 1];

        const rectWidth = localIdx < localArr.length - 1
          ? state.xScale(next.timeRange[0]) - state.xScale(d.timeRange[1]) - (!fitsIn(next) && fitsLeft(next) ? next.val.length * letterWidth + 6 : 0)
          : state.graphW - state.xScale(d.timeRange[1]);

        const lettersToFit = Math.floor((rectWidth - 12) / letterWidth);
        return d.val.length <= lettersToFit;

      }

      function cutLabel(d) {
        const rectWidth = state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0]);
        const letterWidth = state.lineHeight * 0.3;
        const lettersToFit = Math.floor((rectWidth - 12) / letterWidth);
        return d.val.substring(0, lettersToFit - 1) + (lettersToFit - 1 > 0 ? '...' : '');
      }

      function calcShift(d) {
        if (fitsIn(d)) return 6;
        if (fitsLeft(d)) return -6;
        if (fitsRight(d)) return state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0]) + 6
        return 6;
      }

      function fitsOut(d) {
        return fitsLeft(d) || fitsRight(d);
      }
      // newSegments


      newSegments
        .on('mouseover', function () {
          if ('disableHover' in state && state.disableHover)
            return;

          MoveToFront()(this);

          const hoverEnlarge = state.lineHeight * hoverEnlargeRatio;

          d3Select(this)
            .transition().duration(70)
            .attr('x', function (d) {
              return state.xScale(d.timeRange[0]) - hoverEnlarge / 2;
            })
            .attr('width', function (d) {
              return d3Max([1, state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0])]) + hoverEnlarge;
            })
            .attr('y', function (d) {
              return state.yScale(d.group + '+&+' + d.label) - (state.lineHeight + hoverEnlarge) / 2;
            })
            .attr('height', state.lineHeight + hoverEnlarge)
            .style('fill-opacity', 1);
        })
        .on('mouseout', function () {
          d3Select(this)
            .transition().duration(250)
            .attr('x', function (d) {
              return state.xScale(d.timeRange[0]);
            })
            .attr('width', function (d) {
              return d3Max([1, state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0])]);
            })
            .attr('y', function (d) {
              return state.yScale(d.group + '+&+' + d.label) - state.lineHeight / 2;
            })
            .attr('height', state.lineHeight)
            .style('fill-opacity', .8);
        })
        .on('click', function (s) {
          if (state.onSegmentClick)
            state.onSegmentClick(s);
        });

      timelines = timelines.merge(newSegments);
      timelines.selectAll('rect').transition().duration(state.transDuration)
        .attr('x', function (d) {
          return state.xScale(d.timeRange[0]);
        })
        .attr('width', function (d) {
          return d3Max([3, state.xScale(d.timeRange[1]) - state.xScale(d.timeRange[0])]);
        })
        .attr('y', function (d) {
          return state.yScale(d.group + '+&+' + d.label) - state.lineHeight / 2;
        })
        .attr('height', state.lineHeight)
        .style('fill-opacity', .8);

      timelines.selectAll('text').remove(0)

      timelines
        .append('text')
        .html(d => fitsIn(d) || fitsOut(d) ? d.val : cutLabel(d))
        .attr('fill', d => !fitsIn(d) && fitsOut(d) ? '#000' : getCorrectTextColor(state.zColorScale(d.val)))
        .attr('x', d => state.xScale(d.timeRange[0]) + calcShift(d))
        .attr('text-anchor', d => !fitsIn(d) && fitsLeft(d) ? 'end' : 'inherit')
        .style("font-size", state.lineHeight * 0.6 + "px")
        .attr('y', function (d) {
          return state.yScale(d.group + '+&+' + d.label) + (state.lineHeight * 0.7) - state.lineHeight / 2;
        })
        .style('font-family', 'sans-serif')
        .style('fill-opacity', 0);

      timelines.selectAll('text').transition().duration(state.transDuration * 2)
        .attr('x', d => state.xScale(d.timeRange[0]) + calcShift(d))
        .style("font-size", state.lineHeight * 0.6 + "px")
        .attr('y', function (d) {
          return state.yScale(d.group + '+&+' + d.label) + (state.lineHeight * 0.7) - state.lineHeight / 2;
        })
        .style('fill-opacity', .8);
    }
  }
});
