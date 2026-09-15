import './style.css';
import { TimeSeriesChart } from './chart/TimeSeriesChart.js';
import { generateSampleData } from './data/generate-sample-data.js';

const { dates, series } = generateSampleData();

new TimeSeriesChart('#chart', { dates, series, height: 300 });
