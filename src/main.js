import './style.css';
import { TimeSeriesChart } from './chart/TimeSeriesChart.js';
import { createHighchartsComboChart } from './highcharts/createHighchartsComboChart.js';
import { generateSampleData } from './data/generate-sample-data.js';

const { dates, series } = generateSampleData();

new TimeSeriesChart('#chart-custom', { dates, series, height: 296 });
createHighchartsComboChart('#chart-highcharts', { dates, series, height: 296 });
