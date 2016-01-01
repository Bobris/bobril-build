declare var jasmineRequire: any;

(function() {
  var jasmine =jasmineRequire.core(jasmineRequire);
  window['jasmine'] = jasmine;

  var env = jasmine.getEnv();

  var jasmineInterface = jasmineRequire.interface(jasmine, env);
  for (var property in jasmineInterface) window[property] = jasmineInterface[property];

  env.catchExceptions(true);
  env.throwOnExpectationFailure(true);

  env.addReporter({
      jasmineStarted: (suiteInfo: { totalSpecsDefined: number })=>{
          console.log("Started "+ suiteInfo.totalSpecsDefined);
      },
      jasmineDone: ()=>{
          console.log("Done");
      },
      suiteStarted: (result: { decription: string, fullName: string })=>{
          console.log("Suite "+result.fullName);
      },
      specStarted: (result: { decription: string, fullName: string })=>{
          console.log("Spec "+result.fullName);
      },
      specDone: (result: { description: string, status: string, failedExpectations:{ message:string, stack:any }[]})=>{
          console.log("Spec finished "+ result.status);          
      },
      suiteDone: (result: { description: string, status: string, failedExpectations:{ message:string, stack:any }[]})=>{
          console.log("Suite finished "+ result.status);          
      }
  });

  env.specFilter = function(spec) {
    console.log("Filter "+spec.getFullName());
    return true;
  };

  /**
   * Setting up timing functions to be able to be overridden. Certain browsers (Safari, IE 8, phantomjs) require this hack.
   */
  window.setTimeout = window.setTimeout;
  window.setInterval = window.setInterval;
  window.clearTimeout = window.clearTimeout;
  window.clearInterval = window.clearInterval;

  window.onload = function() {
    env.execute();
  };
}());
