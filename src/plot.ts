/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/d3/d3.d.ts" />

module ngPlot {

    interface IPlotScope extends ng.IScope {
        options: any;
        data: any;
        width: number;
        height: number;
        padding: number;
        xDomain: [number, number];
        yDomain: [number, number];
        xLabel: string;
        yLabel: string;
        svg: D3.Selection;
        xScale: D3.Scale.LinearScale;
        yScale: D3.Scale.LinearScale;
        plot;

        render(): any;
        drawAxes();
        drawPlot();
        drawLine(line);
    }
    class PlotCtrl {
        lines: Array<any>;
        constructor(private $scope: IPlotScope) {
            this.lines = [];
            // Things that need to be drawn
            $scope.drawAxes = function () {
                var xAxis = d3.svg.axis()
                    .scale($scope.xScale)
                    .ticks(5)
                    .orient("bottom");
                var yAxis = d3.svg.axis()
                    .scale($scope.yScale)
                    .ticks(5)
                    .orient("left");

                // Draw the axes
                $scope.svg.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + $scope.height + ")")
                    .call(xAxis)
                    .append("text").attr("class","label")
                    .attr("style","text-anchor:middle")
                    .attr("transform", "translate("+$scope.width/2+", "+($scope.padding)+")")
                    .text($scope.xLabel || "");
                $scope.svg.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(" + $scope.padding + ",0)")
                    .call(yAxis)
                    .append("text").attr("class","label")
                    .attr("style","text-anchor:middle")
                    .attr("transform", "translate("+ (-$scope.padding+10)+", "+$scope.height/2+"),"
                                      +"rotate(-90)")
                    .text($scope.yLabel || "");
            };
            $scope.drawPlot = function () {
                var plotData = $scope.data || [[-6, -1], [6, 1]];
                // We want to clip the path to the drawing region. 
                // However, clipping to close at the top makes part of the line
                // disappear
                var clip = $scope.svg.append("defs").append("clipPath")
                    .attr("id", "plotArea")
                    .append("rect")
                    .attr("id", "clip-rect")
                    .attr("x", $scope.padding)
                    .attr("y", 0)
                    .attr("width", $scope.width - $scope.padding * 2)
                    .attr("height", $scope.height)

                var chartBody = $scope.svg.append("g")
                    .attr("clip-path", "url(#plotArea)")

                // This next bit creates an svg path generator
                var pathGen = d3.svg.line()
                    .x(function (d) { return $scope.xScale(d[0]); })
                    .y(function (d) { return $scope.yScale(d[1]); })
                    .interpolate("linear");

                // Now, the plot is actually added to the svg
                $scope.plot = chartBody.append("path")
                    .attr("d", pathGen(plotData))
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");
            };
            $scope.render = () => {
                $scope.svg.selectAll('*').remove();
                var p = $scope.padding;
                var w = $scope.width;
                var h = $scope.height;

                // Set up the scales
                $scope.xScale = d3.scale.linear()
                    .domain($scope.xDomain).range([p, w]);
                $scope.yScale = d3.scale.linear()
                    .domain($scope.yDomain).range([h, p]);

                $scope.drawAxes();
                $scope.drawPlot();
                this.lines.forEach(function (line) {
                    $scope.drawLine(line);
                });
            };

            /* Draw a line in the svg element
             */
            $scope.drawLine = function (line) {
                var sw = line.strokeWidth || 1;
                var color = line.color || 'black';
                var start = line.start;
                var end = line.end;
                var drawnLine = $scope.svg.append("line")
                    .attr("x1", $scope.xScale(start[0]))
                    .attr("y1", $scope.yScale(start[1]))
                    .attr("x2", $scope.xScale(end[0]))
                    .attr("y2", $scope.yScale(end[1]))
                    .attr('stroke-width', sw)
                    .attr('stroke', color)
                return drawnLine;
            };
            
            /* The following sets up watches for data, and config
             */
            $scope.$watch('options',  () => {
                this.setOptions($scope.options);
                $scope.render();
            }, true);
            $scope.$watch('data', function () {
                $scope.render();
            });

            /* We create an apply function (so it can be removed),
             * and force an $apply on resize events, triggering 
             * the `$watch`s in the `link` function.
             */
            var apply = function () { $scope.$apply(); };
            window.addEventListener('resize', apply);
        }
        addLine(line) { this.lines.push(line) }

        /** Sets the options for the plot, such as axis locations, range, etc...
         */
        private setOptions(opts) {
            if (opts) {
                this.$scope.xDomain = opts.xDomain || [-1, 1];
                this.$scope.yDomain = opts.yDomain || [-1, 1];
            }
            else {
                this.$scope.xDomain = [-1, 1];
                this.$scope.yDomain = [-1, 1];
            }
        }

    }
    function plotDirective(): ng.IDirective {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                options: '=',
                data: '='
            },
            controller: PlotCtrl,
            link: function (scope: IPlotScope, elm, attrs) {
                scope.padding = 30;
                scope.svg = d3.select(elm[0])
                    .append("svg")
                    .attr("height", '100%')
                    .attr("width", '100%');

                scope.width = elm[0].offsetWidth - scope.padding;
                scope.height = elm[0].offsetHeight - scope.padding;

                scope.$watch(function () {
                    return elm[0].offsetWidth;
                }, function () {
                        scope.width = elm[0].offsetWidth - scope.padding;
                        scope.height = elm[0].offsetHeight - scope.padding;
                        scope.render();
                    });
                scope.$watch(function () {
                    return elm[0].offsetHeight;
                }, function () {
                        scope.width = elm[0].offsetWidth - scope.padding;
                        scope.height = elm[0].offsetHeight - scope.padding;
                        scope.render();
                    });

            },
            template: '<div ng-transclude></div>',
        };
    }

    interface ILineScope extends ng.IScope {
        value: any;
    }
    function lineDirective(): ng.IDirective {
        return {
            require: '^plot',
            restrict: 'E',
            scope: {
                value: '='
            },
            link: function (scope: ILineScope, element, attrs, plotCtrl) {
                plotCtrl.addLine(scope.value);
            }
        };
    }

    angular.module('plotModule', [])
    // This service is pulled from 
        .directive('plot', plotDirective)
        .directive('line', lineDirective)
    ;
}
