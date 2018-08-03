require( "babel-runtime/regenerator" );
require( './index.html'              );
require( './main.scss'               );
const d3 = require( 'd3' );

////////////////////////////////////////////////////////////////////////////////////////////////////
//                        by Yago Estévez. https://twitter.com/yagoestevez                        //
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////


// Here the data is fetched from the API or throws an error. If everything is OK,
// the Scatter Plot is built using the data from the API.
d3.json(
  'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/cyclist-data.json'
).then( data => {
  // Hides preloader.
  document.getElementById( 'preloader' ).classList.add( 'hidden' ); 
  // Builds the chart.
  const getTheChart = new ChartBuilder( data );
  getTheChart.makeCanvas().drawlabel().setScales().drawAxes().drawDots().setLegend().setTooltip().and.animate();
} )
.catch( error => { throw new Error( error ) } );

// The Chart Builder class.
// Owns all the methods and properties required to build the Scatter Plot.
class ChartBuilder {

  constructor ( data ) {
    // Sets up sizes.
    this.chartWidth  = 800;
    this.chartHeight = 600;
    this.margin      = { top: 50, bottom: 70, left: 70, right: 10 };
    this.innerWidth  = this.chartWidth  - this.margin.left - this.margin.right;
    this.innerHeight = this.chartHeight - this.margin.top  - this.margin.bottom;

    // Sets up the transition options.
    this.transitionDelay    = 40;
    this.transitionDuration = 800;
    this.easingMethod       = d3.easeCircle;

    // Cleans up the received data.
    this.data       = this.cleanUpData( data );

    // Selects the elements.
    this.chart       = d3.select( '#chart' );
    this.canvas      = this.chart.append( 'g' );
    this.xAxisLine   = this.canvas.append( 'g' );
    this.yAxisLine   = this.canvas.append( 'g' );
    this.allDots     = this.canvas.selectAll( 'circle' );
    this.singleDot   = this.allDots.data( this.data ).enter( ).append( 'circle' );
    this.label       = this.canvas.append( 'text' );
    this.tooltip     = this.canvas.append( 'g' );
    this.tooltipIcon = this.tooltip.append( 'path' );
    this.tooltipText = this.tooltip.append( 'text' );
    this.tooltipSub  = this.tooltip.append( 'text' );
    this.legend      = this.canvas.append( 'g' );

    // For chaining methods.
    this.and = this;
  }

  // Cleans up the fetched data array.
  cleanUpData ( rawData ) {
    return rawData.map( (data,i) => {
      const time = data.Time.split( ':' );
      const dupe = i > 0
                && rawData[i-1].Year === rawData[i].Year
                && rawData[i-1].Time === rawData[i].Time;
      return {
        doping  : data.Doping.replace( /^\s+|\s+$/g, '' ),
        name    : data.Name,
        country : data.Nationality,
        time    : new Date( Date.UTC( 1970, 0, 1, 0, time[0], time[1] ) ),
        url     : data.URL,
        year    : +data.Year,
        dupe    : dupe
      };
    } );
  }

  // Creates the canvas for the chart.
  makeCanvas ( ) {
    this.chart.attr(   'viewBox' , `0 0 ${this.chartWidth} ${this.chartHeight}` );
    this.canvas.attr( 'transform', `translate( ${this.margin.left}, ${this.margin.top} )` );
    return this;
  }

  // Puts a label for the Y axis.
  drawlabel ( ) {
    this.label
      .attr( 'class'    , 'label' )
      .attr( 'transform', 'rotate(-90)' )
      .attr( 'x'        , -60 )
      .attr( 'y'        , -50 )
      .html( '⟶ &nbsp; Ascent time (lower means faster) &nbsp; ⟶' );
    return this;
  }

  // Sets up scales for X and Y axes.
  setScales ( ) {
    this.x = d3.scaleLinear( )
      .domain( 
        [ d3.min( this.data, d => d.year - 1 ), d3.max( this.data, d => d.year + 1 ) ]
      )
      .range( [ 0, this.innerWidth ] );
    this.y = d3.scaleTime( )
      .domain( d3.extent( this.data, d => d.time ) )
      .range( [ 0, this.innerHeight ] );
    return this;
  }

  // Creates the bottom and left axes.
  drawAxes ( ) {
    const xAxis = d3.axisBottom( this.x )
      .tickFormat( d => d );
    const yAxis = d3.axisLeft( this.y )
      .tickFormat( d3.timeFormat( '%M:%S' ) )
      .tickSize( this.innerWidth );

    // Creates custom dotted horizontal lines (ticks) along the chart.
    const customYAxis = grp => {
      const sel = grp.selection ? grp.selection( ) : grp;
      grp.call( yAxis );
      sel.select( '.domain' ).remove( );
      sel.selectAll( '.tick line' )
        .filter( Number )
        .attr( 'x1', this.chartWidth - this.margin.left - 5 )
        .attr( 'x2', 0 )
        .attr( 'stroke-dasharray', '2' )
        .attr( 'class', 'dashed-line' );
      sel.selectAll( '.tick text' )
        .attr( 'x' ,  0 )
        .attr( 'dy', -1 );
    }

    this.xAxisLine.call( xAxis )
      .attr( 'class'    , 'x axis' )
      .attr( 'id'       , 'x-axis' )
      .attr( 'transform', `translate( 0, ${this.innerHeight + 5} )` )
      .selectAll( 'text' )
        .attr( 'class', 'x-tick' );
    this.yAxisLine.call( customYAxis )
      .attr( 'class'    , 'y axis' )
      .attr( 'id'       , 'y-axis' )
      .attr( 'transform', 'translate( -5, 0 )' )
      .selectAll( 'text' )
        .attr( 'class', 'y-tick' );
    return this;
  }
  // Drawing the dots for the chart.
  drawDots ( ) {
    this.colorize = d3.scaleOrdinal( [ '#b16f6f', '#6f95b1' ] );
    this.singleDot
      .attr( 'class'       , 'dot' )
      .attr( 'r'           , 20 )
      .attr( 'cx'          , 0 )
      .attr( 'cy'          , this.innerHeight )
      .attr( 'fill'        , d => this.colorize( d.doping !== '' ) )
      .attr( 'opacity'     , 0 )
      .attr( 'data-xvalue' , d => d.year )
      .attr( 'data-yvalue' , d => d.time.toISOString( ) )
    this.handleEvents( );
    return this;
  }

  // Animates the dots.
  animate ( ) {
    this.singleDot.transition( )
      .delay( ( d,i ) => i * this.transitionDelay )
      .duration( this.transitionDuration )
      .ease( this.easingMethod )
        .attr( 'r'           , d => 5 )
        .attr( 'cx'          , d => d.dupe ? this.x( d.year+.2 ) : this.x( d.year ) )
        .attr( 'cy'          , d => this.y( d.time ) )
        .attr( 'opacity'     , 1 )
    return this;
  }

  // Creates the tooltip to be shown when hover each dot.
  setTooltip ( ) {
    this.tooltip.attr( 'id', 'tooltip' ).attr( 'transform', `translate( ${this.innerWidth - 15}, 0)` );
    this.tooltipText.attr( 'id', 'tooltip-text' )
      .attr( 'transform', 'translate( -5, -5 )' );
    this.tooltipSub.attr( 'id', 'tooltip-sub' )
      .attr( 'transform', 'translate( -5, 10 )' );
    this.tooltipIcon.attr( 'id', 'tooltip-icon' )
      .attr(
        'd',
        `M79.544 173.652v-21.96h44.45v43.92h-44.45zm27.199 10.795c.332-.332.433-2.248.157-2.968-.108
        -.283-.496-.419-1.19-.419h-1.03v-6.3c0-4.645-.088-6.418-.334-6.754-.292-.399-.777-.446-3.902
        -.381l-3.57.074v3.44l1.125.08 1.124.082v9.729l-1.124.081-1.125.082-.08 1.563c-.056 1.071.027
         1.632.264 1.782.57.36 9.315.279 9.685-.09zm-2.744-18.884c.511-.511.587-3.805.098-4.294-.198
         -.197-1.176-.317-2.593-.317s-2.395.12-2.593.317c-.184.185-.317 1.066-.317 2.098 0 2.397.24 
         2.612 2.91 2.612 1.537 0 2.187-.108 2.495-.416z`
      )
      .attr( 'transform', 'scale( 0.35 ) translate( -80, -180 )' );
    return this;
  }

  // Creates the legend items from the chart.
  setLegend ( ) {
    this.legendGrp = this.legend.selectAll( 'g' )
      .data( this.colorize.domain( ) )
      .enter( )
      .append( 'g' )
        .attr( 'id', 'legend' )
        .attr( 'transform', ( d,i ) => `translate( 0, ${ 30 + i * 20} )` )
  
    this.legendGrp.append( 'rect' )
      .attr( 'x', this.innerWidth - 15 )
      .attr( 'width', 15 )
      .attr( 'height', 15 )
      .style( 'fill', this.colorize );
    
    this.legendGrp.append( 'text' )
      .attr( 'x', this.innerWidth - 20 )
      .attr( 'y', 11)
      .style( 'fill', this.colorize )
      .text( d => d ? 'Doping allegations' : 'No doping' );
    return this;
  }

  // Sets up the event handlers for each dot.
  handleEvents ( ) {
    let _self = this;
    this.singleDot.on( 'click', ( d,i ) => {
      if ( _self.data[i].url )
        window.open( _self.data[i].url, '_blank' );
    } );
    this.singleDot.on( 'mouseover', function ( d,i ) {
      d3.select( this )
        .transition( )
        .attr( 'r', 30 );
      _self.tooltip
        .attr( 'data-year', d.year )
        .transition( )
        .style( 'opacity', 1 );
      const timeFormat = d3.timeFormat( `%M'%S"` );
      _self.tooltipText.html( `
        ${_self.data[i].name} (${_self.data[i].country}).
        In ${_self.data[i].year} he made it in ${timeFormat(_self.data[i].time)}.
      ` );
      _self.tooltipSub.html( `
        ${_self.data[i].doping || 'Clean. No doping accusations against him' }.
      ` );
    } )
    this.singleDot.on( 'mouseout', function ( d ) {
      d3.select( this )
        .transition( )
        .attr( 'r', 5 );
      _self.tooltip.transition( )
        .style( 'opacity', 0 );
    } );
    return this;
  }

}