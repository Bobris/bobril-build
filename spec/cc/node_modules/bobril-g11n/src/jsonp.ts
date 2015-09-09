export function jsonp(url: string): Promise<any> {
    return new Promise((r, e) => {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.onload = () => {
            r();
        };
        script.onerror = (ev) => {
            e('Failed to load ' + url);
        };
        script.src = url;
        document.head.appendChild(script);
    });
}
