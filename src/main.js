import './style.css';
import { TimeSeriesChart } from './chart/TimeSeriesChart.js';
import { dates, series } from './data/sample-data.js';

new TimeSeriesChart('#chart', { dates, series, height: 300 });
