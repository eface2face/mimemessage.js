import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';


export default [
    {
        input: 'lib/mimemessage.js',
        output: {
            file: pkg.main,
            format: 'cjs'
        },
        name: 'mimemessage',
        plugins: [
            commonjs(),
            babel()
        ]
    }
];
