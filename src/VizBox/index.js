import * as React from 'react';
import * as d3 from 'd3';
import { COLOR_SWATCH } from '../constants.js';

class VizBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: this.props.data.categories,
            dict: this.props.data.jsondict,
            id: this.props.id,
        }
    }

    componentDidMount() {
        this.draw();
    }

    componentDidUpdate() {
        this.draw();
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            data: nextProps.data.categories,
            dict: nextProps.data.jsondict,
        })
    }

    render() {
        const { id } = this.state;
        const vizboxname = "vizbox" + id.toString();
        return (
            <div>
                <div>
                    <button onClick={this.toggleBigCircleFill}>toggle big circle fill</button>
                    <button onClick={this.toggleBigCircleLine}>toggle big circle line</button>
                    <button onClick={this.toggleSmallCircleFill}>toggle small circle fill</button>
                    <button onClick={this.toggleSmallCircleLine}>toggle small circle line</button>
                </div>
                {id.toString() === "1" &&
                    <div style={{fontSize:"11px"}}>
                        <div><label>max font size: </label><input id="maxfontsize1" type="range" min="10" max="100"></input><span id="readmaxfontsize1"></span></div>
                        <div><label>min font size: </label><input id="minfontsize1" type="range" min="10" max="100"></input><span id="readminfontsize1"></span></div>
                        <div><label>weightage...: </label><input id="weightage" type="range" min="0" max="10"></input><span id="readweightage"></span></div>
                        <div>info: basically a weighted power law distribution.</div>
                    </div>}
                {id.toString() === "2" &&
                    <div style={{fontSize:"11px"}}>
                        <div><label>max font size: </label><input id="maxfontsize2" type="range" min="10" max="100"></input><span id="readmaxfontsize2"></span></div>
                        <div><label>min font size: </label><input id="minfontsize2" type="range" min="10" max="100"></input><span id="readminfontsize2"></span></div>
                        <div><label>power: </label><input id="power" type="range" min="1" max="10"></input><span id="readpower"></span></div>
                        <div>info: slightly different, exponential distribution. sorry, its a bit hard to type out the formulas here, so the first one uses a combination of power law on the ordinal frequency ranking of the word, with the weight being how much weight is on the ordinal ranking and away from using absolute/relative frequency to calculate it. this second one is a slightly different exponential distribution, the power refers to the exponent, not the weightage.</div>
                    </div>}
                {id.toString() === "3" &&
                    <div style={{fontSize:"11px"}}>
                        <div><label>max font size: </label><input id="maxfontsize3" type="range" min="10" max="100"></input><span id="readmaxfontsize3"></span></div>
                        <div><label>min font size: </label><input id="minfontsize3" type="range" min="10" max="100"></input><span id="readminfontsize3"></span></div>
                        <div>info: linear</div>
                    </div>}
                <div id={vizboxname} style={{margin: "50px", backgroundColor: "white", minWidth:"500px", outline: "2px solid black"}}>
                </div>
            </div>
        )
    }

    toggleBigCircleFill = () => {
        for (let f of this.fociData) {
            f.focibigcirccolor = (f.focibigcirccolor === f.color ? "none" : f.color);
        }
        this.fociBigCirc.attr("fill", d => d.focibigcirccolor);
    }

    toggleBigCircleLine = () => {
        for (let f of this.fociData) {
            f.focibigcircleline = (f.focibigcircleline === 1.5 ? 0 : 1.5);
        }
        this.fociBigCirc.attr("stroke-width", d => d.focibigcircleline);
    }

    toggleSmallCircleFill = () => {
        for (let n of this.nodesData) {
            n.nodecirclefill = (n.nodecirclefill === n.color ? "none" : n.color);
        }
        this.nodeCirc.attr("fill", d => d.nodecirclefill);
    }

    toggleSmallCircleLine = () => {
        for (let n of this.nodesData) {
            n.nodecircleline = (n.nodecircleline === 1.5 ? 0 : 1.5);
        }
        this.nodeCirc.attr("stroke-width", d => d.nodecircleline);
    }

    draw() {

        if (this.state.data === undefined || this.state.data.length === 0) {
            return;
        }

        d3.select("#vizbox" + this.state.id.toString()).select("svg").remove();

        // -- set up empty svg ---
        this.height = 600;
        this.width = 800;
        this.ctx = document.createElement("canvas").getContext("2d");
        this.clusterPadding = 30;
        this.nodePadding = 30;
        let that = this; // for simulation closure

        this.svg = d3.select("#vizbox" + this.state.id.toString())
                        .append("svg")
                        .attr("viewBox", `0 0 ${this.width} ${this.height}`)
                        .call(d3.zoom()
                                .on("zoom", function() {
                                    that.foci.attr("transform", d3.event.transform);
                                    that.node.attr("transform", d3.event.transform);
                                }));

        // --- utility functions ---
        /*let mapWordFreqToTextAndRectSize = (myWord, myWordFreq, minWordFreq, maxWordFreq, context = this.ctx, minFontSize = 14, maxFontSize = 32, padding = 10) => {
            myWord = myWord + "aa"; // to account for the close button
            let fontSize = mapWordFreqToFontSize(myWordFreq, minWordFreq, maxWordFreq);
            context.font = fontSize + "px sans-serif";

            let bbox = {};
            bbox.width = context.measureText(myWord).width;
            bbox.height = context.measureText("M").width;
            
            return {
                fontsize: fontSize,
                width: bbox.width + padding,
                height: bbox.height + padding
            };
        }*/
        // for scaling examples
        let myrs = 0.5;
        let mymaxfontsize = 60;
        let myminfontsize = 10;
        let  producePowerScale = (rs, maxFontSize, minFontSize) => {
            let wordsWithFreqs = [];
            for (let group of this.state.data) {
                for (let word of group.words) {
                    if (!(wordsWithFreqs.map(d => d[0]).includes(word))) {
                        wordsWithFreqs.push([word, this.state.dict[word]]);
                    }
                }
            }
            wordsWithFreqs.sort((a, b) => b[1] - a[1]);
            let justFreqs = [...new Set(wordsWithFreqs.map(d => d[1]))]
            justFreqs.sort((a, b) => b - a);
            let myMaxFreq = justFreqs[0];
            justFreqs = justFreqs.map(d => [d, d/myMaxFreq]);
            
            let lastFreq = 1;
            let fontSize = maxFontSize;
            let freqWithFontSize = {};
            for (let ff of justFreqs) {
                // oops, where freq is wf[2], forgot to annotate, lazy change
                fontSize = ~~((rs * (ff[1] / lastFreq)) + ((1 - rs) * fontSize))
                fontSize = fontSize < minFontSize ? minFontSize : fontSize;
                freqWithFontSize[ff[0].toString()] = fontSize;
                lastFreq = ff[1];
            }
            
            // returns dict with word count keys and font size values
            return freqWithFontSize;

        }

        this.powerScaleDict = producePowerScale(myrs, mymaxfontsize, myminfontsize);
        
        // sliders
        if (this.state.id.toString() === "1") {
            d3.select("#maxfontsize1").on("input", () => {
                let myMaxFontSize = document.getElementById("maxfontsize1").value * 4;
                d3.select("#readmaxfontsize1").text(myMaxFontSize.toString());
                mymaxfontsize = parseInt(myMaxFontSize);
                this.powerScaleDict2 = producePowerScale(myrs, mymaxfontsize, myminfontsize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, this.powerScaleDict2)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    //console.log("old font size", n.fontsize);
                    n.fontsize = textAndRectSize.fontsize;
                    //console.log("new font size", n.fontsize);
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();


            });
            d3.select("#minfontsize1").on("input", () => {
                let myMinFontSize = document.getElementById("minfontsize1").value / 2;
                d3.select("#readminfontsize1").text(myMinFontSize.toString());
                myminfontsize = parseInt(myMinFontSize);
                this.powerScaleDict2 = producePowerScale(myrs, mymaxfontsize, myminfontsize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, this.powerScaleDict2)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();



            });
            d3.select("#weightage").on("input", () => {
                let myWeightage = document.getElementById("weightage").value / 10;
                d3.select("#readweightage").text((1 - myWeightage).toString());
                myrs = parseFloat(myWeightage);
                this.powerScaleDict2 = producePowerScale(myrs, mymaxfontsize, myminfontsize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, this.powerScaleDict2)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();



            });
        } 

        if (this.state.id.toString() === "2") {
            d3.select("#maxfontsize2").on("input", () => {
                let myMaxFontSize = document.getElementById("maxfontsize2").value * 4;
                d3.select("#readmaxfontsize2").text(myMaxFontSize.toString());
                mymaxfontsize = parseInt(myMaxFontSize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, "", this.ctx, myminfontsize, mymaxfontsize)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();
            });

            d3.select("#minfontsize2").on("input", () => {
                let myMinFontSize = document.getElementById("minfontsize2").value / 2;
                d3.select("#readminfontsize2").text(myMinFontSize.toString());
                myminfontsize = parseInt(myMinFontSize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, "", this.ctx, myminfontsize, mymaxfontsize)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();
            });

            d3.select("#power").on("input", () => {
                let myPower = document.getElementById("power").value;
                d3.select("#readpower").text(myPower.toString());
                powerthingk = parseFloat(myPower);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, "", this.ctx, myminfontsize, mymaxfontsize)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();
            });

        }

        if (this.state.id.toString() === "3") {
            d3.select("#maxfontsize3").on("input", () => {
                let myMaxFontSize = document.getElementById("maxfontsize3").value * 4;
                d3.select("#readmaxfontsize3").text(myMaxFontSize.toString());
                mymaxfontsize = parseInt(myMaxFontSize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, "", this.ctx, myminfontsize, mymaxfontsize)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();
            });

            d3.select("#minfontsize3").on("input", () => {
                let myMinFontSize = document.getElementById("minfontsize3").value /2;
                d3.select("#readminfontsize3").text(myMinFontSize.toString());
                myminfontsize = parseInt(myMinFontSize);
                for (let n of this.nodesData) {
                    let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, "", this.ctx, myminfontsize, mymaxfontsize)
                    n.height = textAndRectSize.height;
                    n.width = textAndRectSize.width;
                    n.fontsize = textAndRectSize.fontsize;
                    n.r = ~~(n.width/2 + n.height/2);
                }

                this.nodeCirc.attr("r", d => d.r);
                
                this.nodeRect.attr("width", d => d.width)
                                .attr("height", d => d.height)

                this.node.select("text")
                                .attr("font-size", d => d.fontsize)
                
                this.node.select("tspan")
                                .attr("font-size", d => d.fontsize*0.8)

                this.simulation.alpha(0.2).restart();
            });

        }

        let powerthing = (myWordFreq, maxFontSize, minFontSize, maxWordFreq, minWordFreq, k) => {
            return Math.pow((((Math.pow(maxFontSize, k))*(myWordFreq - minWordFreq)/maxWordFreq) + Math.pow(minFontSize, k)), 1/k);
            //return (((maxFontSize**2)*(myWordFreq - minWordFreq)/maxWordFreq) + minFontSize**2)**0.5;
        }
        
        let powerthingk = 2;

        let mapWordFreqToTextAndRectSize = (myWord, myWordFreq, minWordFreq, maxWordFreq, correctPowerScaleDict, context = this.ctx, minFontSize = 14, maxFontSize = 32, padding = 10) => {
            console.log("running this", this.state.id.toString())

            let fontSize;
            switch (this.state.id.toString()) {
                case "1":
                    fontSize = correctPowerScaleDict[myWordFreq.toString()];
                    break;
                case "2":
                    //fontSize = (((maxFontSize**2)*(myWordFreq - minWordFreq)/maxWordFreq) + minFontSize**2)**0.5;
                    fontSize = powerthing(myWordFreq, maxFontSize, minFontSize, maxWordFreq, minWordFreq, powerthingk);
                    break;
                case "3":
                    fontSize = (((myWordFreq - minWordFreq)/maxWordFreq)*(maxFontSize - minFontSize))*2 + minFontSize
                    break; 
                default:
                    fontSize = 11;
                    console.log("fucked up somewhere");
                    
            }
            myWord = myWord + "aa"; // to account for the close button
            //let fontSize = mapWordFreqToFontSize(myWordFreq, minWordFreq, maxWordFreq);
            context.font = fontSize + "px sans-serif";

            let bbox = {};
            bbox.width = context.measureText(myWord).width;
            bbox.height = context.measureText("M").width;
            
            return {
                fontsize: fontSize,
                width: bbox.width + padding,
                height: bbox.height + padding
            };
        }

        /*let mapWordFreqToFontSize = (myWordFreq, minWordFreq, maxWordFreq, minFontSize = 14, maxFontSize = 32) => {
        // this is the scaling function, currently linear scaling
            return (((myWordFreq - minWordFreq)/maxWordFreq)*(maxFontSize - minFontSize))*2 + minFontSize
        }*/

        let mapClusterToColour = (cluster) => {
            return COLOR_SWATCH[that.allClusters.indexOf(cluster) % COLOR_SWATCH.length];
        }

        let dataToNodes = (data) => {
            let wordGroups = data;
            let groupName = "";
            let nodeData = [];

            // normal nodes
            for (let group of wordGroups) {
                groupName = group.group_name;
                let words = group.words;
                for (let word of words) {
                    nodeData.push({
                                word: word,
                                wordFreq: +this.state.dict[word],
                                cluster: groupName,
                            });
                }
            }

            this.minWordFreq = Math.min(...nodeData.map( d => d.wordFreq ))
            this.maxWordFreq = Math.max(...nodeData.map( d => d.wordFreq ))

            let halfwidth = ~~this.width/2;
            let halfheight = ~~this.height/2;

            for (let n of nodeData) {
                let textAndRectSize = mapWordFreqToTextAndRectSize(n.word, n.wordFreq, this.minWordFreq, this.maxWordFreq, this.powerScaleDict)
                n.height = textAndRectSize.height;
                n.width = textAndRectSize.width;
                n.fontsize = textAndRectSize.fontsize;
                n.isFoci = false;
                n.x = halfwidth;
                n.y = halfheight;
                n.r = ~~(n.width/2 + n.height/2);
                n.nodecirclefill = "none";
                n.nodecircleline = 0;
            }

            // foci
            let allClusters = [];
            let allClustersWithWordCounts = {};
            for (let n of nodeData) {
                if (!allClusters.includes(n.cluster)) {
                    allClusters.push(n.cluster);
                    //allClustersWithWordCounts[n.cluster] = n.wordFreq;
                    allClustersWithWordCounts[n.cluster] = 1;
                } else {
                    //allClustersWithWordCounts[n.cluster] += n.wordFreq;
                    allClustersWithWordCounts[n.cluster] += 1;
                }
            }

            this.allClusters = allClusters;
            this.allClusters.sort();

            // initialize locations of foci
            allClustersWithWordCounts = Object.keys(allClustersWithWordCounts).map(c => ({cluster: c, wordcount: allClustersWithWordCounts[c]}));

            let pack = d3.pack()
                            .size([this.width, this.height])
                            .radius(d => d.value)
                            .padding(0);

            let hier = d3.hierarchy({children: allClustersWithWordCounts})
                            .sum(d => { let arbitraryNum = 1; return arbitraryNum*d.wordcount} );
            let allClustersWithXY = pack(hier).leaves().map(d => ({ cluster: d.data.cluster, r: d.r, x: d.x, y: d.y }));

            for (let f of allClustersWithXY) {
                f.r = 20; // replace r with default radius size
                f.furthestr = f.r;
                f.color = mapClusterToColour(f.cluster);
                f.isFoci = true;
                f.focibigcirccolor = "none";
                f.focibigcircleline = 1.5;
                
                for (let n of nodeData) {
                    (n.cluster === f.cluster ) && (n.color = f.color);
                }
            }
            
            let fociData = allClustersWithXY;

            return [...nodeData, ...fociData]
            // node: word, wordFreq, fontsize, cluster, height, width, isFoci, color, x, y
            // foci: cluster, r, isFoci, color, x, y
        }

        this.nodes = dataToNodes(this.state.data);
        
        this.nodesData = this.nodes.filter(d => !d.isFoci);

        this.fociData = this.nodes.filter(d => d.isFoci);
        
        this.foci = this.svg
                        .selectAll(".foci")
                        .data(this.fociData)
                        .enter()
                        .append("g")
                        .attr("class", "foci")

        this.fociBigCirc = this.foci.append("circle")
                                    .attr("r", d => d.furthestr)
                                    //.attr("fill", d => d.color)
                                    .attr("fill", d => d.focibigcirccolor)
                                    .attr("fill-opacity", 0.1)
                                    .attr("stroke-width", d => d.focibigcircleline)
                                    .attr("stroke", d => d.color)

        this.fociCirc = this.foci.append("circle")
                                    .attr("r", d => d.r)
                                    .attr("fill", d => d.color)
                                    .attr("fill-opacity", 0.5)
                                    .attr("stroke-width", 1.5)
                                    .attr("stroke", d => d.color)
                                    .attr("cx", d => d.x)
                                    .attr("cy", d => d.y)

        this.fociText = this.foci.append("text")
                                    .text("+")
                                    .attr("text-anchor", "middle")
                                    .attr("alignment-baseline", "middle")
                                    .attr("fill", "white")
                                    .attr("x", d => d.x)
                                    .attr("y", d => d.y)

        this.node = this.svg
                        .selectAll(".node")
                        .data(this.nodesData)
                        .enter()
                        .append("g")
                        .attr("class", "node");

        this.nodeCirc = this.node.append("circle")
                                .attr("fill", d => d.nodecirclefill)
                                .attr("fill-opacity", 0.3)
                                .attr("stroke-width", d => d.nodecircleline)
                                .attr("stroke", d => d.color)
                                .attr("cx", d => d.x)
                                .attr("cy", d => d.y)
                                .attr("r", d => d.r)
                                .attr("class", "thisnodecirc");

        this.nodeRect = this.node.append("rect")
                                .attr("width", d => d.width)
                                .attr("height", d => d.height)
                                .attr("rx", 7)
                                .attr("ry", 7)
                                .attr("fill", "white")
                                .attr("stroke-width", 1.5)
                                .attr("stroke", d => d.color)
                                .attr("x", d => d.x - d.width/2)
                                .attr("y", d => d.y - d.height/2);

        this.nodeTextGroup = this.node.append("g")
                                        .attr("font-size", d => d.fontsize)
                                        .append("text")
                                        .text( d => d.word)
                                        .attr("fill", d => d.color)
                                        .style("text-anchor", "middle")
                                        .style("alignment-baseline", "middle")
                                        .append("tspan")
                                        .text("  \u2716")
                                        .attr("font-size", d => d.fontsize*0.8)
                                        .style("text-anchor", "middle")
                                        .style("alignment-baseline", "central")
                                        .style("fill", "crimson");


        this.simulation = d3.forceSimulation()
                            .alphaDecay(0.01)
                            //.velocityDecay(0.1)
                            //.force("x", d3.forceX().strength(.004))
                            //.force("y", d3.forceY().strength(.004))
                            .force("collide", tickNode)
                            .force("collide2", tickFoci)
                            //.force("manybody", d3.forceManyBody().strength(200))
                            //.force("center", d3.forceCenter(~~this.width/2, ~~this.height/2))
                            //.force("collide", d3.forceCollide().radius(d => d.r))

        this.simulation.nodes(this.nodes)
                        //.on("tick", ticked)
                        //.on("tick.foci", tickFoci)
                        //.on("tick.node", tickNode);

        // --- utility functions ---
        function getFurthestNodeDistFromFoci(foci) {
            let captured = that.nodesData.filter(d => d.cluster === foci.cluster);
            let distances = captured.map( d => ((d.x - foci.x)**2 + (d.y - foci.y)**2)**0.5 + d.r);
            let result = Math.min(Math.max(...distances), 1000); // limit on size of foci
            return result;
        }

        let getFociByCluster = (cluster) => {
            for (let i = 0; i < this.fociData.length; i++) {
                if (this.fociData[i].cluster === cluster) return this.fociData[i];
            }
        }

        function checkval(val) {
            if (!((val < 0) || (val > 0) || (val === 0))) {
                console.log(val);
                debugger;
            }
        }

        // --- end utility functions ---

        function tickFoci(alpha) {
            //let k = this.alpha() * 0.1;
            let k = alpha;

            let fociData = that.fociData;

            const fociQuadtree = d3.quadtree()
                                    .x(d => d.x)
                                    .y(d => d.y)
                                    .addAll(fociData);

            fociData.forEach(function(f) {
                console.log("asked to collide by", that.state.id.toString())
                
                // foci collision
                let r = f.r + 2*getFurthestNodeDistFromFoci(f),
                    nx1 = f.x - r,
                    nx2 = f.x + r,
                    ny1 = f.y - r,
                    ny2 = f.y + r;

                fociQuadtree.visit((visited, x1, y1, x2, y2) => {
                    if (visited.data && (visited.data !== f)) {
                        let x = f.x - visited.data.x,
                            y = f.y - visited.data.y,
                            //l = Math.max(0.0001, Math.sqrt(x*x + y*y)),
                            l = Math.sqrt(x*x + y*y),
                            r1 = getFurthestNodeDistFromFoci(f),
                            r2 = getFurthestNodeDistFromFoci(visited.data);
                            //r1 = 50, r2 = 50;
                            r = r1 + r2 + that.clusterPadding;

                        if (l < r) {
                            l = (l - r) / l * k;

                            f.x -= x *= l;
                            f.y -= y *= l;
                            visited.data.x += x;
                            visited.data.y += y;

                            checkval(x); checkval(y); checkval(visited.data.x); checkval(visited.data.y); checkval(f.x); checkval(f.y);
                        } else if (l > (3.2*r)) {
                            l = (l - r)/l * k; // l > r
                            f.x -= x *= l;
                            f.y -= y *= l;
                            visited.data.x += x;
                            visited.data.y += y;
                        }

                        f.furthestr = r1 + that.clusterPadding/2;
                        visited.data.furthestr = r2 + that.clusterPadding/2;

                    }

                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            });

            that.fociBigCirc.attr("r", d => d.furthestr)
                            .attr("cx", d => d.x)
                            .attr("cy", d => d.y);

            that.fociCirc.attr("cx", d => d.x)
                        .attr("cy", d => d.y);

            that.fociText.attr("x", d => d.x)
                        .attr("y", d => d.y);

            that.simulation.force("collide", tickNode);

        }

        function tickNode(alpha) {
            //let k = this.alpha() * 0.5;
            let k = alpha;
            let nodes = that.nodes;

            const nodeQuadtree = d3.quadtree()
                                    .x(d => d.x)
                                    .y(d => d.y)
                                    .addAll(nodes)

            nodes.forEach(function(n) {
                // node collision
                let r = 2*n.r,
                    nx1 = n.x - r,
                    nx2 = n.x + r,
                    ny1 = n.y - r,
                    ny2 = n.y + r;

                nodeQuadtree.visit((visited, x1, y1, x2, y2) => {
                    if (visited.data && (visited.data !== n)) {
                        let x = n.x - visited.data.x,
                            y = n.y - visited.data.y,
                            l = Math.sqrt(x*x + y*y),
                            r1 = n.r,
                            r2 = visited.data.r,
                            r = r1 + r2 + that.nodePadding;

                        if (l < r) {
                            l = (l - r) / l * k;

                            n.x -= x *= l;
                            n.y -= y *= l;

                            if (!(visited.data.isFoci)) {
                                visited.data.x += x;
                                visited.data.y += y;
                            }

                            checkval(x); checkval(y); checkval(visited.data.x); checkval(visited.data.y); checkval(n.x); checkval(n.y);
                        }

                    }

                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            });


            // interlude - directing nodes to foci
            for (let nn of nodes) {

                let changeY = (getFociByCluster(nn.cluster).y - nn.y) * k * 2;
                let changeX = (getFociByCluster(nn.cluster).x - nn.x) * k * 2;
                //n.y += (getFociByCluster(n.cluster).y - n.y) * k;
                //n.x += (getFociByCluster(n.cluster).x - n.x) * k;
                checkval(nn.x); checkval(nn.y); checkval(changeX); checkval(changeY);
                nn.y += changeY;
                nn.x += changeX;
                checkval(nn.x); checkval(nn.y);
            }

            // end interlude


            that.nodeCirc.attr("cx", d => d.x)
                        .attr("cy", d => d.y);

            that.nodeRect.attr("x", d => d.x - d.width/2)
                        .attr("y", d => d.y - d.height/2);

            that.node.select("text")
                        .attr("x", d => d.x)
                        .attr("y", d => d.y);

        }

        /*function ticked() {
            let k = this.alpha() * 0.5;

            let fociData = that.fociData;

            const fociQuadtree = d3.quadtree()
                                    .x(d => d.x)
                                    .y(d => d.y)
                                    .addAll(fociData);

            fociData.forEach(function(f) {
                
                // foci collision
                let r = f.r,
                    nx1 = f.x - r,
                    nx2 = f.x + r,
                    ny1 = f.y - r,
                    ny2 = f.y + r;

                fociQuadtree.visit((visited, x1, y1, x2, y2) => {
                    if (visited.data && (visited.data !== f)) {
                        let x = f.x - visited.data.x,
                            y = f.y - visited.data.y,
                            l = Math.sqrt(x*x + y*y),
                            r1 = getFurthestNodeDistFromFoci(f),
                            r2 = getFurthestNodeDistFromFoci(visited.data);
                            //r1 = 50, r2 = 50;
                            r = r1 + r2 + that.clusterPadding;

                        if (l < r) {
                            console.log(`${f.cluster} and ${visited.data.cluster} are too close tgt`);
                            l = (l - r) / l * k;

                            f.x -= x *= l;
                            f.y -= y *= l;
                            visited.data.x += x;
                            visited.data.y += y;

                            checkval(x); checkval(y); checkval(visited.data.x); checkval(visited.data.y); checkval(f.x); checkval(f.y);
                        }

                    }

                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            });

            that.fociCirc.attr("cx", d => d.x)
                        .attr("cy", d => d.y);

            that.fociText.attr("x", d => d.x)
                        .attr("y", d => d.y);

            let nodesData = that.nodesData;

            const nodeQuadtree = d3.quadtree()
                                    .x(d => d.x)
                                    .y(d => d.y)
                                    .addAll(that.nodes)

//            nodes.forEach(function(n) {
            for (let n of nodesData) {

                if (n.isFoci) {
                    return;
                }

                let updated = true;

                // node RECT collision
                nodeQuadtree.visit((visited, x1, y1, x2, y2) => {

                    if (visited.data && (visited.data !== n)) {

                        if (visited.data.isFoci) {
                            let x = n.x - visited.data.x,
                                y = n.y - visited.data.y,
                                xSpacing = visited.data.r + n.width/2,
                                ySpacing = visited.data.r + n.height/2,
                                absX = Math.abs(x),
                                absY = Math.abs(y),
                                l,
                                lx,
                                ly;

                            if (( absX < xSpacing ) && ( absY < ySpacing )) {
                                l = Math.max(0.001, Math.sqrt(x*x + y*y));

                                lx = (absX - xSpacing) / l;
                                ly = (absY - ySpacing) / l;

                                if (Math.abs(lx) > Math.abs(ly)) {
                                    lx = 0;
                                } else {
                                    ly = 0;
                                }

                                n.x -= x *= lx
                                n.y -= y *= ly;
                                //visited.data.x += x; // foci do not move
                                //visited.data.y += y;
                                checkval(x); checkval(y); checkval(n.x); checkval(n.y);

                                //updated = true;
                                updated = false; // optimize later

                            }
                        } else { // !visited.data.isFoci

                            let x = n.x - visited.data.x,
                                y = n.y - visited.data.y,
                                xSpacing = ~~(visited.data.width + n.width)/2,
                                ySpacing = ~~(visited.data.height + n.height)/2,
                                absX = Math.abs(x),
                                absY = Math.abs(y),
                                l,
                                lx,
                                ly;


                            if (( absX < xSpacing ) && ( absY < ySpacing )) {
                                l = Math.max(0.001, Math.sqrt(x*x + y*y));

                                lx = (absX - xSpacing) / l;
                                ly = (absY - ySpacing) / l;

                                if (Math.abs(lx) > Math.abs(ly)) {
                                    lx = 0;
                                } else {
                                    ly = 0;
                                }

                                n.x -= ~~(x *= lx);
                                n.y -= ~~(y *= ly);
                                visited.data.x += ~~x;
                                visited.data.y += ~~y;

                            checkval(x); checkval(y); checkval(visited.data.x); checkval(visited.data.y); checkval(n.x); checkval(n.y);
                                //updated = true;
                                updated = false; // optimize later

                            }
                        }
                    }
                    return false;

                });


            // interlude - directing nodes to foci
            for (let nn of nodesData) {

                let changeY = (getFociByCluster(nn.cluster).y - nn.y) * k;
                let changeX = (getFociByCluster(nn.cluster).x - nn.x) * k
                //n.y += (getFociByCluster(n.cluster).y - n.y) * k;
                //n.x += (getFociByCluster(n.cluster).x - n.x) * k;
                checkval(nn.x); checkval(nn.y); checkval(changeX); checkval(changeY);
                nn.y += changeY;
                nn.x += changeX;
                checkval(nn.x); checkval(nn.y);
            }

            // end interlude

            that.nodeRect.attr("x", d => d.x - d.width/2)
                    .attr("y", d => d.y - d.height/2);

            that.node.select("text")
                                .attr("x", d => d.x)
                                .attr("y", d => d.y)

            };

    }*/



    }
}

export default VizBox;
