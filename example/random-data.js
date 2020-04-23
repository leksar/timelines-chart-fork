function getRandomData(ordinal = false) {

  const NGROUPS = 4,
    MAXLINES = 3,
    MAXSEGMENTS = 10,
    MAXCATEGORIES = 20,
    MINTIME = new Date(2013,2,21);

  const nCategories = Math.ceil(Math.random()*MAXCATEGORIES),
    categoryLabels = ['monitor','program','application','keyboard','javascript','gaming','network','3.1.20','213','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  const res = [...Array(NGROUPS).keys()].map(i => ({
    group: categoryLabels[Math.ceil(Math.random()*nCategories)] + (i+1),
    data: getGroupData()
  }));
  res.push({group:'flat', data: getGroupData(), settings: ['flat']});
  return res;
  //

  function getGroupData() {

    return [...Array(Math.ceil(Math.random()*MAXLINES)).keys()].map(i => ({
      label: 'label',
      data: getSegmentsData()
    }));

    //

    function getSegmentsData() {
      const nSegments = Math.ceil(Math.random()*MAXSEGMENTS),
        segMaxLength = Math.round(((new Date())-MINTIME)/nSegments);
      let runLength = MINTIME;

      return [...Array(nSegments).keys()].map(i => {
        const tDivide = [Math.random(), Math.random()].sort(),
          start = new Date(runLength.getTime() + tDivide[0]*segMaxLength),
          end = new Date(runLength.getTime() + tDivide[1]*segMaxLength);

        runLength = new Date(runLength.getTime() + segMaxLength);

        return {
          timeRange: [start, end],
          val: ordinal ? categoryLabels[Math.ceil(Math.random()*nCategories)] : Math.random()
          //labelVal: is optional - only displayed in the labels
        };
      });

    }
  }
}