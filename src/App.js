import React from 'react';
import VizBox from './VizBox';
import * as d3 from 'd3';
//import textStyle from 'style1.module.css';
//import vizBoxStyle from 'style2.module.css';

function csvToArray(csvstr){
    let rows = csvstr.split("\n");
    return rows.map( row => row.split(","));
}

function processCsvContent(csvContent){
    let preCsvArr = csvContent.split("<$$$$$>");
    let displayCsv = csvToArray(preCsvArr[0]);
    displayCsv = displayCsv.map(row => row.filter(Boolean));
    displayCsv = displayCsv.filter(item => item.length > 2);
    displayCsv = displayCsv.slice(1);
    displayCsv = displayCsv.map(row => row.slice(2));

    let preJsonDict = preCsvArr[1].split('\n').join('');
    let jsonDict = JSON.parse(preJsonDict);
    let alt = displayCsv.map( group => ({group_name: group[0], words: group}));

    return ({categories: alt, jsondict: jsonDict});
    /*displayCsv = displayCsv.map( group => group.map( word => [word, jsonDict[word]]))    ;
    displayCsv = displayCsv.map( item => ({ group_name: item[0][0], words: item}));

    // App.js
    let wordGroups = displayCsv;
    let cluster = 0;
    let cleanedData = [];
    console.log(wordGroups);

    if (wordGroups){
        for (let group of wordGroups) {
            let words = group.words;
            cleanedData.push({ value: '+', cluster: cluster});
            for (let word of words){
                cleanedData.push({ value: word, cluster: cluster})
            }
            cluster ++;
        }
    }

    return cleanedData;*/
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { data: [], cleaneddata: []};
        
        this.myFiles = ["file1.csv", "file2.csv", "file3.csv", "file4.csv", "file5.csv", "file6.csv", "file7.csv", "file8.csv", "file9.csv", "gardenofproserpine.20200406093426.csv", "TestAnimation22.20200408082554.csv", "testdata25.20200413112616.csv"];
        this.myFile = 8;
        this.othernodes = d3.range(10).map(d => Math.random());
    }

    getFile() {
        this.myFile = (this.myFile + 1) % this.myFiles.length;
        let serversite = "http://localhost:4444/files/"
        let newFile = serversite + this.myFiles[this.myFile];
        
        fetch(newFile)
                .then(res => res.text())
                .then(data => {
                    this.setState({ data: processCsvContent(data) });
                });
    }

    updateState = (changedData) => {
        this.setState({ cleanedData: changedData });
    }

    componentDidMount() {
        this.getFile();
    }

    render() {
        const { cleanedData } = this.state;
        console.log(this.state.data);
        return (
            <div className="App">
                <button onClick={() => this.getFile()}> switch file </button>
                {/*<div className={vizBoxStyle.container}>*/}
                <div style={{margin: "10px"}}>
                    <VizBox data={this.state.data} updateParentState={this.updateState} id="1" />
                    <VizBox data={this.state.data} updateParentState={this.updateState} id="2" />
                    <VizBox data={this.state.data} updateParentState={this.updateState} id="3" />
                </div>
                {/*<div className={textStyle.container}>*/}
                <div>
                    <p>{JSON.stringify(cleanedData)}</p>
                </div>
            </div>
        );
    }
}

export default App;
