<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randart</title>
    <style>
    html, body
    {
        margin: 0 0;
        padding: 0;
        background: black;
        color: white;
    }
    .ctr
    {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        max-width: 100%;
        max-height: 100%;
    }
    img
    {
        max-width: 100%;
        max-height: 100%;
    }
    </style>
</head>
<body>

<?php

// Globals
$tries = 20;
$delay = 1000000 / $tries; # server throttle
$done = false;
$apiurl = 'https://collectionapi.metmuseum.org/public/collection/v1/';

// Retrieve list of objects that are supposed to have images
$res = file_get_contents($apiurl . 'search?q=hasImages=true');
if($res === false)
{
    echo "<script>console.log('Data lookup failed for " . $apiurl . "' );</script>";
}
else
{
    // Decode object list
    $res = json_decode($res);
    if(is_null($res))
    {
        echo "<script>console.log('Data encoding error from " . $apiurl . "' );</script>";
    }
    else
    {
        // Try a few different times because not all have a useable primaryImage
        for ($x = 0; $x < $tries; $x++)
        {
            $index = rand(0, $res->total-1);
            // Retrieve information about given object
            $objurl = $apiurl . 'objects/' . $index;
            $obj = file_get_contents($objurl);
            if($obj === false)
            {
                echo "<script>console.log('Data lookup failed for " . $objurl . "' );</script>";
            }
            else
            {
                // Decode
                $obj = json_decode($obj);
                if(is_null($obj))
                {
                    echo "<script>console.log('Data encoding error from " . $objurl . "' );</script>";
                }
                else
                {
                    // Check for image validity
                    $imgurl = $obj->primaryImage;
                    if(exif_imagetype($imgurl) === false)
                    {
                        echo "<script>console.log('Not an image: " . $imgurl . "' );</script>";

                    }
                    else
                    {
                        // Display image
                        echo "<a href='" . $obj->objectURL . "'>";
                        echo "<div class='ctr'>";
                        echo "<img src='" . $imgurl . "' alt='" . $obj->title . "'/>";
                        echo "</div>";
                        echo "</a>";
                        $done = true;
                        break;
                    }
                }
            }
            // Throttle
            usleep($delay);
        }
    }
}

// Error message if everything else failed
if( ! $done )
{
    echo "<script>console.log('Image lookup failed' );</script>";
    echo "<h2>Image lookup failed</h2>";
}
?>

</body>
