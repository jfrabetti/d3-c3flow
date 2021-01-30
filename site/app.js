
var g = {
  msHost:      "<host_name",
  msPort:      <ms_port>,
  curChartIdx: 0,
  nextTsMs:    0,
  quantizeMs:  5*60*1000,
  maxWndN:     288,
  simulateFl:  false,
  simulDate:  "2020-11-16 14:50:00",
  simulIndex:  0,
 
  chartL: [
    { enableFl:true, divId:'#test1',        nfStr:'.2f', traceId:'stats1', lastTs:0, key:'stat_1_',  testLastTs:0,   test_key:'stat1_',  chart:null, title:'title1'},
    { enableFl:true, divId:'#test2', nfStr:'.2f', traceId:'stats2', lastTs:0, key:'stat_2_',  testLastTs:0,   test_key:'stat2_',  chart:null, title:'title2'},
  ]
}


// Used for both single and multi-line charts
function initMultiXY( divId, title, nfStr )    
{
  var dvId  = divId
  dvId      = dvId.replace('#', '');
  var divID = document.getElementById(dvId);
  divID.innerHTML += '';
                                  
  chart = c3.generate({
    bindto: divId,
    data: {
      x: 'x',
      xFormat: '%Y-%m-%d %H:%M:%S',
      columns: [
        ['x'    ],
      ],
      type: "line",
    },
    legend: {
      show: false
    },
    title: {
      text: title
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: { rotate:    -20,
                multiline: false,
                format:    '%m-%d %H:%M' 
              },
        height: 35
      },
      y: {
        tick: { format: d3.format(nfStr)}
        
      }
    }
  })  
  
  return chart
}   

function plotAlert( chartIdx, dateS )
{
  g.chartL[chartIdx].chart.xgrids.add({value: dateS, text:'Alert'} )
}

// Plot the points in (tsV[],valV[]).
// The plot will display at most 'maxWndN' data points before scrolling off the oldest data points.
function plotPoints( chartIdx, tsV, valV, maxWndN )
{
  var chart   = g.chartL[chartIdx].chart
  var traceId = g.chartL[chartIdx].traceId  
  var dataA   = chart.data(traceId)
  
  // if the trace has not yet been added then add it
  if( dataA==null || dataA.length == 0)
  {
    chart.load({ columns: [ ['x' ], [traceId ] ] })
  }

  // get the chart data value array
  var dA      = chart.data.values(traceId)
  var scrollN = 0

  // get the length of the chart data value array
  var daN = 0;
  if( dA != null )
  { daN = dA.length }

  // if the chart data value array is not empty
  if( (dA != null) && (dA.length + valV.length > maxWndN) )
  {
    scrollN = (dA.length + valV.length) - maxWndN
  }

  
  var valueV =  Array.prototype.slice.call(valV); // convert valV to an Array
  valueV.unshift(traceId)  // add the 'traceId' to the beginning of the y-coord array
  tsV.unshift('x')         // add 'x' to the beginning of the x-coord array

  // update the chart and scroll off old points
  chart.flow(
    {
      columns: [
        tsV,
        valueV
      ],
      length: scrollN,
      duration: 0
    }
  )

  // get the data associated with the first data point
  var dt0 = chart.data(traceId)[0].values[0].x

  // if a marker exists
  for(var i=0; i < chart.xgrids().length; ++i )
  {
    // get the date assoc'd with the oldest label
    var label_dt0 = Date.parse(chart.xgrids()[i].value)

    // if label time is prior to the first data point time
    if( dt0.getTime() > label_dt0 )
    {
      // ... remove the label
      chart.xgrids.remove({'value': chart.xgrids()[i].value })
    }    
  }
}


// Given a microservice key and a number
function get_chart_idx( key )
{
  for(var i=0; i<g.chartL.length; ++i)
    if( g.chartL[i].key == key || g.chartL[i].test_key==key )
      return i
    
  console.log("Chart not found for:" + key )
}

// This function is the async response handler.
function _handle_http_response( d )
{
  // if the response has a valid value
  if( d.status == 'ok' )
  {
    const N = d.value.length
    var chartIdx = null
    var xA = []
    var yA = []

    console.log("N:"+N)

    // for each msg response
    for(var i=0; i<N; ++i)
    {
      var r = d.value[i]

      console.log(r.status + " " + r.key+ " " + r.value)

      // if this msg is valid
      if( r.status == 'ok' )
      {
	      const y		= Number.parseFloat(r.value)
	      const key	= r.key
	      const keyL	= key.split('_')
      	const dateL	= keyL[2].split('-')
      	const dateS	= dateL[0]+'-'+dateL[1]+'-'+dateL[2]+' '+dateL[3]+':'+dateL[4]+':'+dateL[5]

      	var   date      = new Date(dateS)

        if( chartIdx == null )
        {
           chartIdx  = get_chart_idx(keyL[0]+'_'+keyL[1]+"_")
        }

      	if( keyL[0].substring(0,2) == 'test' )
      	{
      	  if(y!=0)
      	  {
      	    plotAlert( chartIdx, dateS )
      	  }

      	  // this msg was valid and plotted so move lastTs to this time
      	  g.chartL[chartIdx].testLastTs = date.getTime() 
      	  
      	}
      	else
      	{
      	  // update the chart 
      	  // plotPoints(  chartIdx, [dateS], [y], maxWndN )
          
          xA.push( dateS)
          yA.push(y)

      	  // this msg was valid and plotted so move lastTs to this time
      	  g.chartL[chartIdx].lastTs = date.getTime() 
      	}
      }
    } 
    
    if(xA.length)
    {
      plotPoints(chartIdx,xA,yA,g.maxWndN)
    }

  }  
}

// This function is the async response handler.
function handle_http_response( responseText )
{
  // convert the response into a JSON object
  // console.log(responseText)
  var d  = JSON.parse(responseText)

  _handle_http_response( d )  
}

// Format the timestamp as a database key.
function form_key_date( ts )
{
  const yr     = ts.getFullYear()
  const mo     = ts.getMonth() + 1
  const dy     = ts.getDate()
  const hr     = ts.getHours()
  const mn     = ts.getMinutes()
  const sc     = ts.getSeconds()
  const pre_mo = mo < 10 ? "0" : ""
  const pre_dy = dy < 10 ? "0" : ""
  const pre_hr = hr < 10 ? "0" : ""
  const pre_mn = mn < 10 ? "0" : ""
  const pre_sc = sc < 10 ? "0" : ""
    
  const tsStr  = "" + yr + "-" + pre_mo + mo + "-" + pre_dy + dy + "-" + pre_hr + hr + "-" + pre_mn + mn + "-" + pre_sc + sc

  return tsStr
}

// Simulation button handler
function on_simulate_button()
{
  // create a data object based on the base simulation date
  var dt = new Date(g.simulDate)

  var key_str = ""

  if( g.simulIndex>0 && (g.simulIndex % 5) == 0 )
  {
    // add a five minute offset multiple from the base simulation date
    dt.setTime( dt.getTime() + (g.simulIndex-1) * (5*60*1000))

    // form a database search key
    key_str = "stat1_" + form_key_date( dt )    
  }
  else
  {
    // add a five minute offset multiple from the base simulation date
    dt.setTime( dt.getTime() + g.simulIndex * (5*60*1000))

    // form a database search key
    key_str = "stat_1_" + form_key_date( dt )
  }
  
  // form a simulated database response
  const msg = {
    status: "ok",
    message: "ok",
    value: [
      { status: "ok", message: "ok", key:key_str, value:g.simulIndex,  result: "ok"}
    ]  
  }

  // decode simulated database msg and plot the point
  _handle_http_response( msg )

  // increment the time factor
  g.simulIndex += 1	
}

// Make an async call to the microservice.
function httpGetAsync(theUrl, callback)
{
  var xmlHttp = new XMLHttpRequest();
  
  xmlHttp.onreadystatechange = function()
  { 
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
    {
      callback(xmlHttp.responseText);
    }
  }
  
  xmlHttp.open("GET", theUrl, true); // true for asynchronous 
  xmlHttp.send(null);
}


function _call_database( lastTs, key )
{
  // form the microservice URL
  var d = new Date()
  d.setTime( lastTs + g.quantizeMs )
  
  var tsStr    = form_key_date( d )
  var url      = "http://"+g.msHost+":"+g.msPort+"/querytime/" + key + tsStr

  // make an async call to the microservice
  // and then call handle_http_response() with the microservice response
  httpGetAsync(url, handle_http_response )
 
}

// Update g.chartL[ chartIdx ]
function updateChart( chartIdx )
{
  // if this chart is enabled
  if( g.chartL[ chartIdx ].enableFl )
  {
    _call_database( g.chartL[ chartIdx ].lastTs,   g.chartL[ chartIdx ].key )
    _call_database( g.chartL[ chartIdx ].testLastTs, g.chartL[ chartIdx ].test_key )    
  }
}

// Main application timer callback.
// This function is called every 10 seconds,
// but only attempts to update the charts every 'execPeriodMs' seconds.
function timer_callback()
{
  // execution period in ms
  const execPeriodMs = 60*1000
  
  curTsMs = Date.now()

  // if we have arrived at the next execution time
  if( g.nextTsMs <= curTsMs )
  {
    // update chartL[g.curChartIdx]
    updateChart( g.curChartIdx )

    g.curChartIdx += 1

    // if all charts have been updated for this exec period ...
    if( g.curChartIdx >= g.chartL.length )
    {
      // ... then increment the next exec time stamp and reset the chart index
      g.curChartIdx = 0;
      g.nextTsMs   += execPeriodMs
    }
  }     
}

// Application main function
function main()
{
  const timerPeriodMs = 10000
  
  // initialize the next chart update time as 'now'.
  g.nextTsMs = Date.now() - (24 * 60 * 60 * 1000)
  const fiveMinMs = 5*60*1000
  g.nextTsMs = Math.round(g.nextTsMs / fiveMinMs) * fiveMinMs

  // initialize the main control array
  for(var i=0; i<g.chartL.length; ++i)
    if( g.chartL[i].enableFl )
    {
      g.chartL[i].lastTs   = g.nextTsMs
      g.chartL[i].testLastTs = g.nextTsMs
      g.chartL[i].chart    = initMultiXY( g.chartL[i].divId, g.chartL[i].title, g.chartL[i].nfStr )        
    }

  
  btn = document.getElementById('simulate_btn_id')
  
  // trigger a callback every 'timerPeriodMs' milliseconds
  if( !g.simulateFl )
  {
    btn.style.display='none'
    setInterval(timer_callback, timerPeriodMs )
  }
}
